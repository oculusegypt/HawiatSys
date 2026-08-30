import { useSiteSettings } from "@/context/SiteSettingsContext"

const FAQS = [
  {
    question: "كيف أختار الحاوية المناسبة لمخلفات البناء في الرياض؟",
    answer:
      "يعتمد الاختيار على كمية المخلفات ونوع العمل ومساحة الموقع. تناسب الحاوية الصغيرة أعمال الترميم المحدودة، بينما تحتاج مشاريع الهدم والبناء إلى مقاس أكبر لتقليل عدد مرات النقل.",
  },
  {
    question: "كيف يتم تحديد سعر تأجير الحاوية؟",
    answer:
      "يُحدد العرض بعد معرفة المقاس ونوع المخلفات وموقع التوصيل ومدة التأجير وعدد مرات السحب أو التبديل. نوضح هذه البنود قبل اعتماد الطلب حتى تكون التكلفة مفهومة.",
  },
  {
    question: "هل تشمل خدمة تأجير الحاويات التوصيل والسحب؟",
    answer:
      "نعم، ننسق موعد توصيل الحاوية إلى موقع المشروع ثم سحبها أو تبديلها عند الامتلاء أو انتهاء المدة، وفق خطة العمل والعنوان المتفق عليه.",
  },
  {
    question: "هل تتوفر حاويات نفايات للمطاعم والمنشآت؟",
    answer:
      "نوفر حلول حاويات نفايات للمطاعم والمقاهي والمنشآت، كما ننسق جداول الرفع والمكابس للمواقع التي تنتج كميات مستمرة من النفايات.",
  },
]

function formatToday() {
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())
}

export function HomeSeoIntro() {
  const { companyName } = useSiteSettings()
  const resolvedCompany = companyName || "مؤسسة تقي جروب"
  const today = new Date().toISOString().slice(0, 10)

  return (
    <section
      id="home-search-guide"
      className="border-y border-slate-200 bg-slate-50 py-14"
      aria-labelledby="home-search-guide-heading"
    >
      <div className="container mx-auto max-w-5xl px-4 md:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <span className="font-bold text-primary">دليل محدث لخدمات تأجير الحاويات في الرياض</span>
          <span>
            آخر تحديث للمعلومات:{" "}
            <time dateTime={today} className="font-bold text-slate-900">
              {formatToday()}
            </time>
          </span>
        </div>

        <article className="rounded-3xl bg-white p-6 shadow-sm md:p-9">
          <h2 id="home-search-guide-heading" className="text-2xl font-black leading-tight text-primary md:text-3xl">
            تأجير الحاويات ونقل مخلفات البناء والهدم في الرياض
          </h2>
          <p className="mt-4 leading-8 text-slate-700">
            تقدم {resolvedCompany} خدمة منظمة لتأجير الحاويات بالرياض للمنازل والمقاولين والمطاعم والمنشآت. نساعدك
            على اختيار حاوية أنقاض أو حاوية نفايات تناسب حجم العمل، ثم ننسق التوصيل والسحب والتبديل حسب موعد
            المشروع وموقعه. تبدأ الخدمة بإرسال نوع المخلفات والمقاس التقريبي والعنوان ومدة الاحتياج، وبعد مراجعة
            التفاصيل تحصل على عرض واضح وخطة تنفيذ مفهومة.
          </p>
          <p className="mt-4 leading-8 text-slate-700">
            تشمل حاويات مخلفات البناء مواد الترميم والهدم والخرسانة والبلوك والرمل والبلاط والجبس بورد ضمن الحدود
            المسموح بها. أما حاويات النفايات للمطاعم والمقاهي والمنشآت فتناسب المخلفات اليومية وتدعم جدول رفع
            منتظماً للمواقع ذات التشغيل المستمر. تختلف المقاسات والمدة والتكلفة من مشروع إلى آخر، لذلك نعتمد على
            معلومات الموقع الفعلية بدلاً من تقديم سعر ثابت لا يناسب كل حالة.
          </p>

          <div className="mt-7 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-black text-primary">كيف تتم عملية الطلب؟</h3>
              <ol className="mt-3 list-decimal space-y-2 ps-5 leading-8 text-slate-700">
                <li>حدد نوع المخلفات: أنقاض بناء، ترميم، هدم، نفايات مطعم أو نفايات منشأة.</li>
                <li>أرسل العنوان والمقاس المتوقع ومدة بقاء الحاوية في الموقع.</li>
                <li>نراجع إمكانية الوصول وننسق موعد التوصيل والسحب أو التبديل.</li>
                <li>تستلم عرضاً واضحاً قبل اعتماد الخدمة وبدء التنفيذ.</li>
              </ol>
            </div>
            <div>
              <h3 className="text-lg font-black text-primary">ما الذي يميز الخدمة داخل الرياض؟</h3>
              <p className="mt-3 leading-8 text-slate-700">
                نغطي شمال وشرق وغرب وجنوب ووسط الرياض، ونخدم أحياء مثل الملقا والياسمين والنرجس وحطين واليرموك
                والروضة والنسيم والسويدي والشفا والعزيزية والعليا والسليمانية. يساعد وصف الموقع الدقيق على اختيار
                موعد مناسب وتفادي التأخير، كما يسهّل تنسيق السحب بعد امتلاء الحاوية أو انتهاء العمل.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-7">
            <h3 className="text-lg font-black text-primary">إجابات سريعة قبل طلب الحاوية</h3>
            <dl className="mt-4 space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <dt className="font-bold text-slate-900">{faq.question}</dt>
                  <dd className="mt-2 leading-8 text-slate-600">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </article>
      </div>
    </section>
  )
}