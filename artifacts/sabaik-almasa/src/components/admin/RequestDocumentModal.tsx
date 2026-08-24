import { useEffect, useMemo, useState } from "react"
import {
  type ContainerSystemRecord,
  type ServiceRequest,
  useCreateContainerContractWorkflow,
  useCreateContainerSystemRecord,
  getGetContainerSystemQueryKey,
  useGetContainerSystem,
} from "@workspace/api-client-react"
import { useLocation } from "wouter"
import { ContractWizard } from "@/pages/admin/ContractWizard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export type RequestDocumentContext = Pick<ServiceRequest, "id" | "clientName" | "phone" | "email" | "serviceType" | "containerSize" | "location" | "duration" | "notes" | "appointmentType" | "scheduledAt">

type Props = {
  request: RequestDocumentContext | null
  kind: "contract" | "invoice" | null
  onClose: () => void
}

function payloadOf(record: ContainerSystemRecord) {
  return record.payload as Record<string, unknown>
}

export default function RequestDocumentModal({ request, kind, onClose }: Props) {
  const [, navigate] = useLocation()
  const { toast } = useToast()
  // The invoice action also needs the authoritative customer list so the
  // request can be linked to a customer record before it reaches the API.
  const { data: snapshot } = useGetContainerSystem({ query: { enabled: Boolean(request && (kind === "contract" || kind === "invoice")), queryKey: getGetContainerSystemQueryKey() } })
  const contractMutation = useCreateContainerContractWorkflow()
  const invoiceMutation = useCreateContainerSystemRecord()
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (request && kind === "invoice") {
      setAmount("")
      setNotes(request.notes ?? "")
    }
  }, [request, kind])

  const records = snapshot?.records ?? []
  const customer = useMemo(() => records.find(record => {
    if (record.kind !== "customer" || record.status === "archived") return false
    const payload = payloadOf(record)
    return String(payload.name ?? payload.customerName ?? "").trim() === request?.clientName.trim() ||
      String(payload.phone ?? "").replace(/\D/g, "") === (request?.phone ?? "").replace(/\D/g, "")
  }), [records, request])

  if (!request || !kind) return null

  const createInvoice = () => {
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast({ title: "أدخل قيمة الفاتورة أولاً", variant: "destructive" })
      return
    }
    if (!customer?.id) {
      toast({ title: "لا يمكن إصدار الفاتورة: لم يتم العثور على العميل الرسمي لهذا الطلب", variant: "destructive" })
      return
    }
    const tax = Math.round(numericAmount * 15) / 100
    invoiceMutation.mutate({
      data: {
        kind: "invoice",
        status: "draft",
        payload: {
          requestId: request.id,
          serviceRequestId: request.id,
          customerRecordId: customer.id,
          invoiceNumber: `INV-REQ-${request.id}-${Date.now()}`,
          customerName: String(payloadOf(customer).name ?? payloadOf(customer).customerName ?? request.clientName),
          customerPhone: String(payloadOf(customer).phone ?? payloadOf(customer).mobile ?? request.phone),
          customerEmail: String(payloadOf(customer).email ?? request.email ?? ""),
          customerAddress: String(payloadOf(customer).address ?? payloadOf(customer).location ?? request.location ?? ""),
          serviceType: request.serviceType,
          description: request.notes ?? request.serviceType,
          quantity: 1,
          unitPrice: numericAmount,
          subtotal: numericAmount,
          taxRate: 15,
          tax,
          total: numericAmount + tax,
          issueDate: new Date().toISOString().slice(0, 10),
          dueDate: new Date().toISOString().slice(0, 10),
          notes,
          createdFrom: "service_request",
        },
      },
    }, {
      onSuccess: created => {
        onClose()
        toast({ title: "تم إنشاء الفاتورة بنجاح" })
        if (created?.id) navigate(`/admin/container-system/invoice/${created.id}/details`)
      },
      onError: error => toast({ title: error instanceof Error ? error.message : "تعذر إنشاء الفاتورة", variant: "destructive" }),
    })
  }

  const submitContract = (payload: Record<string, unknown>) => {
    const appointmentDate = String(payload.appointmentDate ?? "")
    const appointmentTime = String(payload.appointmentTime ?? "09:00")
    const appointmentType = String(payload.appointmentType ?? "delivery")
    const contractNumber = String(payload.contractNumber ?? "")
    contractMutation.mutate({
      data: {
        operationKey: crypto.randomUUID(),
        contract: payload,
        assignment: {
          siteRecordId: payload.siteRecordId,
          containerRecordId: payload.containerRecordId,
          contractNumber,
          assignmentStatus: "reserved",
          startDate: payload.startDate,
          endDate: payload.endDate,
          containerCode: payload.containerCode,
          customerRecordId: payload.customerRecordId,
          notes: "تم الإنشاء من طلب الخدمة",
        },
        appointment: {
          contractNumber,
          customerRecordId: payload.customerRecordId,
          customerName: payload.customerName,
          containerRecordId: payload.containerRecordId,
          containerCode: payload.containerCode,
          appointmentType,
          appointmentDate,
          appointmentTime,
          scheduledAt: `${appointmentDate}T${appointmentTime}:00`,
          source: "service_request",
        },
        serviceRequest: {
          requestId: request.id,
          clientName: request.clientName,
          phone: request.phone,
          email: request.email,
          serviceType: request.serviceType,
          containerSize: request.containerSize,
          location: request.location,
          duration: request.duration,
          notes: request.notes,
          appointmentType: "scheduled",
          scheduledAt: `${appointmentDate}T${appointmentTime}:00`,
        },
      },
    }, {
      onSuccess: result => {
        onClose()
        toast({ title: "تم إنشاء العقد بنجاح" })
        const id = (result as { contract?: { id?: number } })?.contract?.id
        if (id) navigate(`/admin/container-system/contract/${id}/print`)
      },
      onError: error => toast({ title: error instanceof Error ? error.message : "تعذر إنشاء العقد", variant: "destructive" }),
    })
  }

  if (kind === "contract") {
    return (
      <ContractWizard
        open
        records={records}
        initialCustomerId={customer?.id ?? null}
        initialRequest={request}
        busy={contractMutation.isPending}
        onClose={onClose}
        onSubmit={submitContract}
      />
    )
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent dir="rtl" className="z-[100] max-w-lg">
        <DialogHeader><DialogTitle>إصدار فاتورة للطلب #{request.id}</DialogTitle></DialogHeader>
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-4 p-0">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-bold">{request.clientName}</p>
              <p className="text-slate-500">{request.serviceType} · {request.phone}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-invoice-amount">قيمة الفاتورة قبل الضريبة</Label>
              <Input id="request-invoice-amount" type="number" min="0" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-invoice-notes">ملاحظات</Label>
              <Textarea id="request-invoice-notes" value={notes} onChange={event => setNotes(event.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>إلغاء</Button>
              <Button onClick={createInvoice} disabled={invoiceMutation.isPending} className="bg-cyan-800 hover:bg-cyan-900">
                {invoiceMutation.isPending ? "جارٍ الإنشاء..." : "إنشاء الفاتورة وفتحها"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}