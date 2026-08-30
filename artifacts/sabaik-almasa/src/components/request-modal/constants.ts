import { Box, Truck, FileText, Sparkles, Layers, ShieldCheck, Wrench, Factory } from "lucide-react"

export const SERVICE_TYPES = [
  {
    id: "حاويات الأنقاض",
    label: "حاويات الأنقاض ومخلفات الهدم",
    icon: Box,
    desc: "حاويات بمقاسات 12 إلى 30 ياردة لمخلفات الهدم والترميم والرمل والبلوك",
    color: "from-amber-500/20 to-amber-600/10 border-amber-200 text-amber-700"
  },
  {
    id: "حاويات النفايات",
    label: "حاويات النفايات والمكابس",
    icon: Truck,
    desc: "حاويات 6 و10 ياردة ومكابس نفايات كهربائية للمطاعم والمنشآت التجارية",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-200 text-emerald-700"
  },
  {
    id: "عقود النظافة",
    label: "عقود النظافة وتجديد الرخص",
    icon: FileText,
    desc: "عقود موثقة ومعتمدة من أمانة الرياض لتجديد رخص الأنشطة التجارية",
    color: "from-blue-500/20 to-blue-600/10 border-blue-200 text-blue-700"
  },
  {
    id: "نقل الأنقاض والمخلفات",
    label: "نقل الأنقاض والمخلفات",
    icon: Truck,
    desc: "أسطول شاحنات مجهز لنقل مخلفات البناء والهدم والتفريغ في المرادم الرسمية",
    color: "from-orange-500/20 to-orange-600/10 border-orange-200 text-orange-700"
  },
  {
    id: "ردم وتسوية الأراضي",
    label: "ردم وتسوية الأراضي",
    icon: Layers,
    desc: "أعمال الدفان والتسوية بدقة هندسية عالية ومعدات ثقيلة متطورة",
    color: "from-purple-500/20 to-purple-600/10 border-purple-200 text-purple-700"
  },
  {
    id: "تنظيف وتطهير المواقع",
    label: "تنظيف وتطهير المواقع بعد الهدم",
    icon: Sparkles,
    desc: "إزالة الغبار والأتربة والأنقاض الدقيقة وتسليم الموقع جاهزاً",
    color: "from-teal-500/20 to-teal-600/10 border-teal-200 text-teal-700"
  },
]

export const DEBRIS_CONTAINERS = [
  { id: "حاوية صغيرة 12 ياردة", name: "حاوية صغيرة (12 ياردة)", size: "12 ياردة", capacity: "10 م³", priceText: "400 ريال / للرد", icon: Box, best: "المشاريع الصغيرة والترميم", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "حاوية متوسطة 15 ياردة", name: "حاوية متوسطة (15 ياردة)", size: "15 ياردة", capacity: "12 م³", priceText: "450 ريال / للرد", icon: Box, best: "مشاريع الترميم والتوسعة", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "حاوية كبيرة 20 ياردة", name: "حاوية كبيرة (20 ياردة)", size: "20 ياردة", capacity: "16 م³", priceText: "600 ريال / للرد", icon: Box, best: "المشاريع الإنشائية والهدم", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "حاوية جامبو 30 ياردة", name: "حاوية جامبو (30 ياردة)", size: "30 ياردة", capacity: "22 م³", priceText: "700 ريال / للرد", icon: Box, best: "المشاريع الكبرى والهدم الشامل", color: "bg-amber-50 text-amber-700 border-amber-200" },
]

export const WASTE_CONTAINERS = [
  { id: "حاوية نفايات صغيرة 6 ياردة", name: "حاوية نفايات صغيرة (6 ياردة)", size: "6 ياردة", capacity: "6 م³", priceText: "عقد سنوي / حسب الموقع", icon: Truck, best: "المحلات والمطاعم الصغيرة", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "حاوية نفايات متوسطة 10 ياردة", name: "حاوية نفايات متوسطة (10 ياردة)", size: "10 ياردة", capacity: "8 م³", priceText: "عقد سنوي / حسب الموقع", icon: Truck, best: "المستودعات والمراكز التجارية", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "مكبس نفايات كهربائي 2 ياردة", name: "مكبس نفايات كهربائي (2 ياردة)", size: "2 ياردة", capacity: "4 م³", priceText: "عقد سنوي / حسب الموقع", icon: Layers, best: "المجمعات والفنادق والمطاعم", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
]
