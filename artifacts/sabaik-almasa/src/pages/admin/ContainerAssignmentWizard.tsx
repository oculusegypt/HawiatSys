import { useEffect, useMemo, useState } from "react"
import type { ContainerSystemRecord } from "@workspace/api-client-react"
import { CheckCircle2, Link2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

type Props = {
  open: boolean
  records: ContainerSystemRecord[]
  initialContainerId?: number | null
  busy?: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => void
}

const payloadOf = (record: ContainerSystemRecord) => record.payload as Record<string, unknown>
const labelOf = (record: ContainerSystemRecord) => String(payloadOf(record).name ?? payloadOf(record).customerName ?? payloadOf(record).contractNumber ?? payloadOf(record).assetCode ?? record.reference ?? `#${record.id}`)

export function ContainerAssignmentWizard({ open, records, initialContainerId = null, busy = false, onClose, onSubmit }: Props) {
  const [contractRecordId, setContractRecordId] = useState("")
  const [containerRecordId, setContainerRecordId] = useState("")
  const [siteRecordId, setSiteRecordId] = useState("")
  const [error, setError] = useState("")
  const contracts = useMemo(() => records.filter(record => record.kind === "contract" && record.status !== "archived"), [records])
  const contract = contracts.find(record => String(record.id) === contractRecordId)
  const customerId = contract ? String(payloadOf(contract).customerRecordId ?? "") : ""
  const sites = useMemo(() => records.filter(record => record.kind === "customer_site" && record.status !== "archived" && (!customerId || String(payloadOf(record).customerRecordId) === customerId)), [customerId, records])
  const containers = useMemo(() => records.filter(record => ["container", "container_asset"].includes(record.kind) && record.status !== "archived" && ["available", "reserved", "متاح"].includes(record.status)), [records])

  useEffect(() => {
    if (!open) return
    setContractRecordId("")
    setSiteRecordId("")
    setContainerRecordId(initialContainerId ? String(initialContainerId) : "")
    setError("")
  }, [initialContainerId, open])

  if (!open) return null
  const submit = () => {
    if (!contract || !siteRecordId || !containerRecordId) {
      setError("اختر عقداً وموقعاً تابعاً له وأصلاً متاحاً")
      return
    }
    onSubmit({ contractRecordId: contract.id, siteRecordId: Number(siteRecordId), containerRecordId: Number(containerRecordId), assignmentStatus: "reserved", startDate: new Date().toISOString().slice(0, 10), notes: "تم التخصيص من المسار السياقي" })
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" dir="rtl">
    <Card className="w-full max-w-2xl overflow-hidden border-cyan-100 shadow-2xl">
      <CardContent className="p-0">
        <header className="flex items-start justify-between bg-[#123d4e] p-6 text-white">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-900"><Link2 size={20} /></div><div><h2 className="text-xl font-black">تخصيص أصل لحاوية</h2><p className="mt-1 text-xs text-cyan-100/75">اختر العلاقات من سياقها؛ لا حاجة لإدخال المعرّفات يدوياً.</p></div></div>
          <button type="button" onClick={onClose} className="text-2xl text-cyan-100/70 hover:text-white" aria-label="إغلاق"><X /></button>
        </header>
        <div className="space-y-5 p-6">
          <div><Label htmlFor="assignment-contract">العقد</Label><select id="assignment-contract" value={contractRecordId} onChange={event => { setContractRecordId(event.target.value); setSiteRecordId(""); setError("") }} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">اختر العقد</option>{contracts.map(record => <option key={record.id} value={record.id}>{labelOf(record)} · {String(payloadOf(record).customerName ?? "عميل غير محدد")}</option>)}</select></div>
          <div><Label htmlFor="assignment-site">موقع العميل</Label><select id="assignment-site" value={siteRecordId} onChange={event => { setSiteRecordId(event.target.value); setError("") }} disabled={!contract} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"><option value="">{contract ? (sites.length ? "اختر موقعاً تابعاً للعميل" : "لا توجد مواقع لهذا العميل") : "اختر العقد أولاً"}</option>{sites.map(record => <option key={record.id} value={record.id}>{labelOf(record)} · {String(payloadOf(record).address ?? "")}</option>)}</select></div>
          <div><Label htmlFor="assignment-container">أصل الحاوية المتاح</Label><select id="assignment-container" value={containerRecordId} onChange={event => { setContainerRecordId(event.target.value); setError("") }} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">اختر الأصل</option>{containers.map(record => <option key={record.id} value={record.id}>{labelOf(record)} · {String(payloadOf(record).typeName ?? "نوع غير محدد")}</option>)}</select></div>
          {contract && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-950"><div className="flex items-center gap-2 font-black"><CheckCircle2 size={17} /> سياق العقد جاهز</div><p className="mt-1 text-xs">سيتم التحقق من أن الموقع يتبع عميل العقد وأن الأصل غير مخصص لعقد آخر.</p></div>}
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" disabled={busy} onClick={submit} className="gap-2 bg-cyan-800 hover:bg-cyan-900">{busy ? "جارٍ التخصيص..." : "تأكيد التخصيص"} <CheckCircle2 size={16} /></Button></div>
        </div>
      </CardContent>
    </Card>
  </div>
}