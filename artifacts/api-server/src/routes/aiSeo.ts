import { Router } from "express";
import { getSetting } from "./settings";
import { writeFile } from "fs/promises";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import { requireAdmin, requireSectionPermission } from "../middleware/adminAuth";

const __dirnameAiSeo = dirname(fileURLToPath(import.meta.url));

const router = Router();
router.use("/admin", requireAdmin, requireSectionPermission("seo"));

// ── Saudi-market SEO prompt ────────────────────────────────────────────────────
const buildPrompt = (title: string, description: string) => `
أنت خبير سيو متخصص في السوق السعودي والمحتوى العربي. مهمتك توليد بيانات سيو دقيقة ومُحسَّنة.

المدخلات:
- العنوان: ${title || "غير محدد"}
- الوصف الحالي: ${description || "غير محدد"}

المطلوب:
1. وصف الخدمة (serviceDescription): وصف تفصيلي باللغة العربية لا يقل عن 40 كلمة — يشرح الخدمة بوضوح ويبرز فوائدها ومميزاتها للعميل في السوق السعودي
2. عنوان سيو (Title Tag): بين 50 و60 حرفاً — يحتوي الكلمة المفتاحية الأهم وإشارة للسعودية أو المدينة إن كانت مناسبة
3. وصف تعريفي (Meta Description): بين 120 و160 حرفاً — جذاب، يتضمن فائدة واضحة ودعوة للتصرف
4. كلمات مفتاحية: 5-7 كلمات مفتاحية سعودية مفصولة بفاصلة عربية (،) — تشمل صيغ البحث الشائعة باللهجة السعودية ومدن رئيسية
5. Slug: بالعربية فقط مع شرطات، قصير وواضح (حروف عربية وأرقام وشرطات فقط)

قواعد صارمة:
- serviceDescription: لا تقل عن 40 كلمة عربية، واضحة وتسويقية تصف مزايا الخدمة
- seoDescription: بين 120 و160 حرفاً بالضبط، تنتهي بدعوة للتصرف
- seoSlug: بالعربية فقط. ممنوع استخدام الحروف الإنجليزية أو الرموز غير المسموح بها في الرابط
- لا تكرر نفس النص في serviceDescription و seoDescription

أجب بـ JSON صالح فقط — بدون أي نص أو شرح قبله أو بعده:
{
  "serviceDescription": "...",
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "...",
  "seoSlug": "..."
}
`.trim();

// ── Provider callers ───────────────────────────────────────────────────────────
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as GeminiResponse;
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? "";
}

async function callQwen(apiKey: string, apiHost: string, prompt: string, model?: string): Promise<string> {
  const host = (apiHost ?? "").trim();
  // Detect Alibaba Cloud MaaS workspace endpoints (ws-*.maas.aliyuncs.com)
  // and use the OpenAI-compatible path. Standard DashScope uses /v1 directly.
  let base: string;
  if (host.startsWith("http")) {
    base = host.replace(/\/+$/, "");                           // already a full URL
  } else if (host.includes(".maas.aliyuncs.com")) {
    base = `https://${host}/compatible-mode/v1`;               // MaaS workspace
  } else {
    base = `https://${(host || "dashscope-intl.aliyuncs.com")}/v1`; // standard DashScope
  }
  const chosenModel = (model ?? "").trim() || "qwen3-max";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: chosenModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Qwen HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as OpenAiResponse;
  return (data?.choices?.[0]?.message?.content as string) ?? "";
}

async function callZhipu(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });
  if (!res.ok) throw new Error(`Zhipu HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as OpenAiResponse;
  return (data?.choices?.[0]?.message?.content as string) ?? "";
}

// ── JSON extraction (handles ```json ... ``` wrappers and <think> blocks) ──────
function extractJson(text: string): Record<string, unknown> {
  // Strip <think>...</think> reasoning blocks (Qwen3 / DeepSeek chain-of-thought)
  let clean = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  // Find the outermost JSON object by scanning character by character
  // (avoids greedy regex matching across nested braces in HTML content)
  let start = -1;
  let depth = 0;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === "{") { if (depth === 0) start = i; depth++; }
    else if (clean[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return JSON.parse(clean.slice(start, i + 1)) as Record<string, unknown>;
      }
    }
  }
  throw new Error("No JSON object found in response");
}

function normalizeArabicSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\u0600-\u06FF0-9-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Blog AI prompts ────────────────────────────────────────────────────────────

const buildBlogBasicsPrompt = (topic: string, siteName: string) => `
أنت كاتب محتوى محترف متخصص في السوق السعودي. مهمتك توليد معلومات أساسية لمقالة مدونة عن الموضوع التالي.

الموضوع: ${topic}

المطلوب توليده:
1. title: عنوان جذاب ومثير للاهتمام (بين 50 و70 حرفاً) يتضمن الكلمة المفتاحية الرئيسية
2. excerpt: ملخص تشويقي (بين 100 و160 حرفاً) يدفع القارئ للاستمرار في القراءة
3. category: اختر تصنيفاً واحداً مناسباً من هذه القائمة فقط: ["عام", "نصائح", "تأجير الحاويات", "نقل الأنقاض", "أسعار", "أحياء الرياض", "البيئة", "أخبار"]
4. tags: مصفوفة من 3-5 وسوم قصيرة (كلمة أو كلمتان لكل وسم) مرتبطة بالموضوع
5. readTime: وقت القراءة التقديري بالدقائق (رقم بين 3 و10)
6. author: اكتب اسم الموقع الموجود في الإعدادات دائماً: "${siteName}"

قواعد صارمة:
- اكتب باللغة العربية الفصحى المبسطة
- اجعل العنوان والملخص مرتبطَين بخدمات تأجير حاويات الأنقاض ونقل المخلفات في الرياض والسعودية
- لا تضف أي نص قبل أو بعد JSON

أجب بـ JSON صالح فقط:
{
  "title": "...",
  "excerpt": "...",
  "category": "...",
  "tags": ["...", "...", "..."],
  "readTime": 5,
  "author": "${siteName}"
}
`.trim();

const buildBlogContentPrompt = (title: string, excerpt: string, category: string, tags: string[], siteName: string) => `
أنت كاتب محتوى متخصص في مجال تأجير الحاويات ونقل الأنقاض في المملكة العربية السعودية.
اكتب مقالة مدونة كاملة ومحسّنة لمحركات البحث باللغة العربية الفصحى.

معلومات المقالة:
- العنوان: ${title}
- الملخص: ${excerpt}
- التصنيف: ${category}
- الوسوم: ${tags.join("، ")}

المطلوب:
اكتب مقالة HTML كاملة (بين 600 و900 كلمة) مع:
- مقدمة جذابة (فقرتان)
- 3-4 عناوين فرعية <h2> مع محتوى تفصيلي تحت كل منها
- قوائم <ul>/<ol> عند الاقتضاء
- فقرة خاتمة تتضمن دعوة للتصرف مرتبطة بـ ${siteName}
- تضمين الكلمات المفتاحية بشكل طبيعي في النص

قواعد HTML:
- استخدم فقط: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>
- لا تضع وسم <html> أو <body> أو <head>
- ابدأ مباشرة بأول عنصر HTML

أجب بـ JSON صالح فقط (ضع HTML كاملاً في حقل content):
{
  "content": "<h2>...</h2><p>...</p>..."
}
`.trim();

const buildBlogSeoPrompt = (title: string, excerpt: string, category: string, tags: string[], siteName: string) => `
أنت خبير سيو متخصص في السوق السعودي. قم بتوليد بيانات SEO كاملة لمقالة مدونة.

معلومات المقالة:
- العنوان: ${title}
- الملخص: ${excerpt}
- التصنيف: ${category}
- الوسوم: ${tags.join("، ")}

المطلوب:
1. seoTitle: عنوان سيو (50-60 حرفاً) يتضمن الكلمة المفتاحية الرئيسية + "| ${siteName}"
2. seoDescription: وصف تعريفي (120-160 حرفاً) جذاب يتضمن فائدة واضحة ودعوة للتصرف
3. seoKeywords: 5-8 كلمات مفتاحية سعودية مفصولة بفاصلة عربية (،) تشمل صيغ بحث شائعة
4. seoSlug: رابط URL بالعربية فقط (حروف عربية وأرقام وشرطات فقط، 3-7 كلمات)
5. canonicalUrl: اتركه فارغاً ""

قواعد:
- seoDescription بين 120 و160 حرفاً بالضبط
- seoSlug بالعربية فقط مع شرطات بدل المسافات، بدون أحرف إنجليزية أو رموز
- لا نص قبل أو بعد JSON

أجب بـ JSON صالح فقط:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "...",
  "seoSlug": "...",
  "canonicalUrl": ""
}
`.trim();

const buildPageBasicsPrompt = (keyword: string, siteName: string) => `
أنت كاتب محتوى محترف متخصص في تأجير الحاويات ونقل الأنقاض ومخلفات البناء في السوق السعودي. أنشئ معلومات أساسية لصفحة هبوط SEO تستهدف الكلمة المفتاحية التالية:

الكلمة المفتاحية: ${keyword}

المطلوب JSON صالح فقط:
{
  "title": "عنوان عربي واضح يتضمن الكلمة المفتاحية ومدينة الرياض عند الحاجة",
  "excerpt": "ملخص تسويقي من 100 إلى 160 حرفاً",
  "category": "تصنيف مناسب مثل تأجير الحاويات أو نقل الأنقاض أو مخلفات البناء أو حلول المنشآت",
  "tags": ["3-5 وسوم مرتبطة"],
  "author": "${siteName}"
}

اكتب عن خدمة يمكن لمؤسسة تأجير حاويات ونقل مخلفات بالرياض تقديمها بصدق. لا تدّعِ خدمات تنظيف منازل أو إصلاح أو بيع لا علاقة لها بالنشاط. اجعل الدعوة النهائية مرتبطة بـ ${siteName}.
`.trim();

const buildPageContentPrompt = (title: string, keyword: string, excerpt: string, siteName: string) => `
اكتب محتوى HTML أصلياً ومفيداً باللغة العربية الفصحى لصفحة خدمة SEO:
- العنوان: ${title}
- الكلمة المفتاحية المستهدفة: ${keyword}
- الملخص: ${excerpt}

المطلوب: 700-1000 كلمة، مقدمة واضحة، عناوين <h2> و<h3>، فوائد الخدمة، ما يتضمنه التنفيذ، أسئلة شائعة، وخاتمة فيها دعوة لطلب عرض سعر من ${siteName} في الرياض.
استخدم فقط وسوم HTML التالية: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>.
لا تذكر سعراً ثابتاً ولا تضمن نتيجة لا يمكن التحقق منها. أجب JSON صالحاً فقط:
{"content":"<h2>...</h2><p>...</p>"}
`.trim();

const buildPageSeoPrompt = (title: string, keyword: string, excerpt: string) => `
أنشئ بيانات SEO لصفحة هبوط عربية لمؤسسة تأجير حاويات ونقل أنقاض بالرياض.
- العنوان: ${title}
- الكلمة المفتاحية: ${keyword}
- الملخص: ${excerpt}

أجب JSON صالحاً فقط:
{
  "seoTitle": "عنوان بين 50 و60 حرفاً يتضمن الكلمة المفتاحية والرياض",
  "seoDescription": "وصف بين 120 و160 حرفاً مع فائدة ودعوة للتصرف",
  "seoKeywords": "6-10 كلمات مفتاحية مفصولة بفاصلة عربية",
  "seoSlug": "رابط عربي قصير بشرطات فقط",
  "canonicalUrl": ""
}
`.trim();

// ── Shared AI caller ───────────────────────────────────────────────────────────
async function callAI(prompt: string, maxTokens: number, settings: {
  geminiKey: string; qwenKey: string; qwenHost: string; qwenModel: string;
  zhipuKey: string; order: string[];
}): Promise<string> {
  const { geminiKey, qwenKey, qwenHost, qwenModel, zhipuKey, order } = settings;
  const attempts: string[] = [];
  for (const provider of order) {
    try {
      let raw = "";
      if (provider === "gemini" && geminiKey) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
            }),
          }
        );
        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
        const data = await res.json() as GeminiResponse;
        raw = (data?.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? "";
      }
      if (provider === "qwen" && qwenKey) raw = await callQwen(qwenKey, qwenHost, prompt, qwenModel);
      if (provider === "zhipu" && zhipuKey) {
        const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${zhipuKey}` },
          body: JSON.stringify({
            model: "glm-4-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: maxTokens,
          }),
        });
        if (!res.ok) throw new Error(`Zhipu HTTP ${res.status}`);
        const data = await res.json() as OpenAiResponse;
        raw = (data?.choices?.[0]?.message?.content as string) ?? "";
      }
      if (!raw) { attempts.push(`${provider}: مفتاح غير مُعيَّن`); continue; }
      return raw;
    } catch (e) {
      attempts.push(`${provider}: ${String(e)}`);
      continue;
    }
  }
  throw new Error(`فشل الاتصال بجميع مزودي الذكاء الاصطناعي. ${attempts.join(" | ")}`);
}

async function getAISettings() {
  const geminiKey = await getSetting("ai_gemini_key");
  const qwenKey   = await getSetting("ai_qwen_key");
  const qwenHost  = await getSetting("ai_qwen_host");
  const qwenModel = await getSetting("ai_qwen_model");
  const zhipuKey  = await getSetting("ai_zhipu_key");
  const orderRaw  = await getSetting("ai_provider_order");
  let order: string[] = ["qwen", "zhipu", "gemini"];
  try { order = JSON.parse(orderRaw); } catch {}
  return { geminiKey, qwenKey, qwenHost, qwenModel, zhipuKey, order };
}

// ── POST /api/admin/ai/generate-blog-basics ─────────────────────────────────
router.post("/admin/ai/generate-blog-basics", async (req, res) => {
  try {
    const { topic = "" } = req.body as Record<string, string>;
    if (!topic.trim()) return res.status(400).json({ error: "يرجى إدخال موضوع المقالة أولاً" });
    const settings = await getAISettings();
    const siteName = (await getSetting("company_name")).trim() || "الشركة";
    const raw = await callAI(buildBlogBasicsPrompt(topic, siteName), 600, settings);
    const result = extractJson(raw);
    if (typeof result.tags === "string") {
      try { result.tags = JSON.parse(result.tags); } catch {}
    }
    return res.json(result);
  } catch (e) {
    return res.status(503).json({ error: String(e) });
  }
});

// ── POST /api/admin/ai/generate-blog-content ──────────────────────────────────
router.post("/admin/ai/generate-blog-content", async (req, res) => {
  try {
    const { title = "", excerpt = "", category = "", tags = [] } = req.body as {
      title: string; excerpt: string; category: string; tags: string[];
    };
    if (!title.trim()) return res.status(400).json({ error: "العنوان مطلوب لتوليد المحتوى" });
    const settings = await getAISettings();
    const siteName = (await getSetting("company_name")).trim() || "الشركة";
    const raw = await callAI(buildBlogContentPrompt(title, excerpt, category, tags, siteName), 2500, settings);

    // Try to extract JSON first; if not found, treat the entire response as HTML content
    let content: string;
    try {
      const result = extractJson(raw);
      content = (result.content as string) ?? raw;
    } catch {
      // Strip optional markdown code fences if present
      content = raw
        .replace(/^```(?:html)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    }

    return res.json({ content });
  } catch (e) {
    return res.status(503).json({ error: String(e) });
  }
});

// ── POST /api/admin/ai/generate-blog-seo ──────────────────────────────────────
router.post("/admin/ai/generate-blog-seo", async (req, res) => {
  try {
    const { title = "", excerpt = "", category = "", tags = [] } = req.body as {
      title: string; excerpt: string; category: string; tags: string[];
    };
    if (!title.trim()) return res.status(400).json({ error: "العنوان مطلوب لتوليد بيانات SEO" });
    const settings = await getAISettings();
    const siteName = (await getSetting("company_name")).trim() || "الشركة";
    const raw = await callAI(buildBlogSeoPrompt(title, excerpt, category, tags, siteName), 600, settings);
    const result = extractJson(raw);
    if ("seoSlug" in result) result.seoSlug = normalizeArabicSlug(result.seoSlug);
    return res.json(result);
  } catch (e) {
    return res.status(503).json({ error: String(e) });
  }
});

// ── SEO landing page generation ───────────────────────────────────────────────
router.post("/admin/ai/generate-page-basics", async (req, res) => {
  try {
    const { keyword = "" } = req.body as { keyword?: string };
    if (!keyword.trim()) return res.status(400).json({ error: "الكلمة المفتاحية مطلوبة" });
    const siteName = (await getSetting("company_name")).trim() || "الشركة";
    const raw = await callAI(buildPageBasicsPrompt(keyword, siteName), 700, await getAISettings());
    const result = extractJson(raw);
    if (typeof result.tags === "string") {
      try { result.tags = JSON.parse(result.tags); } catch {}
    }
    return res.json(result);
  } catch (error) {
    return res.status(503).json({ error: String(error) });
  }
});

router.post("/admin/ai/generate-page-content", async (req, res) => {
  try {
    const { title = "", keyword = "", excerpt = "" } = req.body as {
      title?: string; keyword?: string; excerpt?: string;
    };
    if (!title.trim()) return res.status(400).json({ error: "العنوان مطلوب لتوليد المحتوى" });
    const siteName = (await getSetting("company_name")).trim() || "الشركة";
    const raw = await callAI(buildPageContentPrompt(title, keyword || title, excerpt, siteName), 2800, await getAISettings());
    let content = raw;
    try { content = (extractJson(raw).content as string) || raw; } catch {
      content = raw.replace(/^```(?:html|json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    return res.json({ content });
  } catch (error) {
    return res.status(503).json({ error: String(error) });
  }
});

router.post("/admin/ai/generate-page-seo", async (req, res) => {
  try {
    const { title = "", keyword = "", excerpt = "" } = req.body as {
      title?: string; keyword?: string; excerpt?: string;
    };
    if (!title.trim()) return res.status(400).json({ error: "العنوان مطلوب لتوليد بيانات SEO" });
    const result = extractJson(await callAI(
      buildPageSeoPrompt(title, keyword || title, excerpt),
      700,
      await getAISettings(),
    ));
    if ("seoSlug" in result) result.seoSlug = normalizeArabicSlug(result.seoSlug);
    return res.json(result);
  } catch (error) {
    return res.status(503).json({ error: String(error) });
  }
});

// ── POST /api/admin/ai/generate-seo ───────────────────────────────────────────
router.post("/admin/ai/generate-seo", async (req, res) => {
  try {
    const { title = "", description = "" } = req.body as Record<string, string>;
    if (!title.trim() && !description.trim()) {
      return res.status(400).json({ error: "يرجى إدخال عنوان أو وصف أولاً" });
    }

    const geminiKey  = await getSetting("ai_gemini_key");
    const qwenKey    = await getSetting("ai_qwen_key");
    const qwenHost   = await getSetting("ai_qwen_host");
    const qwenModel  = await getSetting("ai_qwen_model");
    const zhipuKey   = await getSetting("ai_zhipu_key");
    const orderRaw   = await getSetting("ai_provider_order");

    let order: string[] = ["qwen", "zhipu", "gemini"];
    try { order = JSON.parse(orderRaw); } catch {}

    const prompt   = buildPrompt(title, description);
    const attempts: string[] = [];

    for (const provider of order) {
      try {
        let raw = "";
        if (provider === "gemini" && geminiKey) raw = await callGemini(geminiKey, prompt);
        if (provider === "qwen"   && qwenKey)   raw = await callQwen(qwenKey, qwenHost, prompt, qwenModel);
        if (provider === "zhipu"  && zhipuKey)  raw = await callZhipu(zhipuKey, prompt);
        if (!raw) { attempts.push(`${provider}: مفتاح غير مُعيَّن`); continue; }
        const result = extractJson(raw);
        if ("seoSlug" in result) result.seoSlug = normalizeArabicSlug(result.seoSlug);
        return res.json({ ...result, provider });
      } catch (e) {
        attempts.push(`${provider}: ${String(e)}`);
        continue;
      }
    }

    return res.status(503).json({
      error: "فشل الاتصال بجميع مزودي الذكاء الاصطناعي. تحقق من مفاتيح API في إعدادات الذكاء الاصطناعي.",
      attempts,
    });
  } catch {
    return res.status(500).json({ error: "خطأ داخلي في الخادم" });
  }
});

// ── POST /api/admin/shorten-url ───────────────────────────────────────────────
router.post("/admin/shorten-url", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) return res.status(400).json({ error: "url مطلوب" });
  try {
    const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    if (!r.ok) throw new Error(`TinyURL ${r.status}`);
    const short = (await r.text()).trim();
    if (!short.startsWith("http")) throw new Error("استجابة غير متوقعة");
    return res.json({ short });
  } catch {
    return res.json({ short: url }); // fallback: return original URL
  }
});

// ── Local rule-based SEO analyzer (no AI key required) ────────────────────────
interface SeoSuggestion {
  field: string;
  issue: string;
  current: string;
  suggestion: string;
  impact: "high" | "medium" | "low";
  reason: string;
}

function analyzeLocalSeo(data: {
  title: string; description: string; keywords: string;
  ogTitle: string; ogDescription: string; canonicalUrl: string; siteName: string;
}): SeoSuggestion[] {
  const { title, description, keywords, ogTitle, ogDescription, canonicalUrl, siteName } = data;
  const suggestions: SeoSuggestion[] = [];

  // ── Title checks ──────────────────────────────────────────────────────────
  if (!title.trim()) {
    suggestions.push({
      field: "title", impact: "high",
      issue: "عنوان الصفحة غير محدد",
      current: "",
      suggestion: `${siteName} | تأجير الحاويات ونقل المخلفات بالرياض — تواصل معنا`,
      reason: "العنوان ضروري لظهور الموقع في نتائج البحث.",
    });
  } else if (title.length < 50) {
    suggestions.push({
      field: "title", impact: "high",
      issue: `العنوان قصير جداً (${title.length} حرف — المثالي 50-60)`,
      current: title.slice(0, 80),
      suggestion: title.includes("الرياض")
        ? `${title} | خدمة 24 ساعة — اتصل الآن`
        : `${title} | تأجير حاويات الرياض — خدمة سريعة`,
      reason: "العناوين القصيرة تُستغل جزءاً فقط من مساحة SERP المتاحة.",
    });
  } else if (title.length > 60) {
    suggestions.push({
      field: "title", impact: "medium",
      issue: `العنوان طويل جداً (${title.length} حرف — الحد الأقصى 60)`,
      current: title.slice(0, 80),
      suggestion: title.slice(0, 57) + "...",
      reason: "جوجل يقطع العناوين التي تتجاوز ~60 حرفاً في صفحات النتائج.",
    });
  } else if (!title.match(/الرياض|الرياد|riyadh/i)) {
    suggestions.push({
      field: "title", impact: "medium",
      issue: "العنوان لا يتضمن كلمة 'الرياض' الجغرافية",
      current: title.slice(0, 80),
      suggestion: title.replace(/(—|\|)/i, (m) => `${m} الرياض`).slice(0, 60),
      reason: "تضمين المدينة في العنوان يُحسّن ظهورك في نتائج البحث المحلي.",
    });
  }

  // ── Description checks ────────────────────────────────────────────────────
  if (!description.trim()) {
    suggestions.push({
      field: "description", impact: "high",
      issue: "وصف الصفحة (Meta Description) غير محدد",
      current: "",
      suggestion: `${siteName} — متخصصون في تأجير الحاويات ونقل المخلفات بالرياض. تواصل معنا للحصول على عرض مناسب.`,
      reason: "الوصف يظهر مباشرة في نتائج البحث ويرفع معدل النقر.",
    });
  } else if (description.length < 120) {
    suggestions.push({
      field: "description", impact: "high",
      issue: `الوصف قصير جداً (${description.length} حرف — المثالي 120-160)`,
      current: description.slice(0, 100),
      suggestion: description.length < 80
        ? `${description} حاويات 6-20 ياردة متوفرة. توصيل سريع لجميع أحياء الرياض خلال 2-4 ساعات. اتصل الآن: 0536312121`
        : `${description} اتصل الآن: 0536312121`,
      reason: "الوصف القصير لا يستغل المساحة المتاحة ويُفوّت فرصة دعوة للتصرف.",
    });
  } else if (description.length > 160) {
    suggestions.push({
      field: "description", impact: "medium",
      issue: `الوصف طويل جداً (${description.length} حرف — الحد الأقصى 160)`,
      current: description.slice(0, 100) + "...",
      suggestion: description.slice(0, 157) + "...",
      reason: "جوجل يقطع الأوصاف الطويلة مما يُشوّه الرسالة التسويقية.",
    });
  } else {
    const hasCTA = /اتصل|تواصل|احجز|اطلب|0\d{9}|واتساب/i.test(description);
    if (!hasCTA) {
      suggestions.push({
        field: "description", impact: "medium",
        issue: "الوصف لا يتضمن دعوة للتصرف (CTA)",
        current: description.slice(0, 100),
        suggestion: description.slice(0, 145) + " — اتصل الآن",
        reason: "إضافة CTA مثل 'اتصل الآن' ترفع معدل النقر بنسبة 10-30%.",
      });
    }
  }

  // ── Keywords checks ───────────────────────────────────────────────────────
  if (!keywords.trim()) {
    suggestions.push({
      field: "keywords", impact: "low",
      issue: "الكلمات المفتاحية غير محددة",
      current: "",
      suggestion: "تأجير حاويات بالرياض، حاويات أنقاض، حاويات نفايات، نقل مخلفات البناء، عقود مواقع",
      reason: "رغم أن جوجل لا يعتمدها مباشرة، تساعد في تنظيم المحتوى ومحركات أخرى.",
    });
  } else {
    const kwList = keywords.split(/[,،]/).map(k => k.trim()).filter(Boolean);
    if (kwList.length < 4) {
      suggestions.push({
        field: "keywords", impact: "low",
        issue: `عدد الكلمات المفتاحية قليل (${kwList.length} كلمة — الموصى به 5-8)`,
        current: keywords.slice(0, 100),
        suggestion: keywords + "، تأجير حاويات بالرياض، أسعار الحاويات، نقل مخلفات البناء",
        reason: "إضافة كلمات متنوعة يُوسّع نطاق الظهور في نتائج البحث الطويلة.",
      });
    }
    if (!keywords.includes("الرياض") && !keywords.includes("riyadh")) {
      suggestions.push({
        field: "keywords", impact: "medium",
        issue: "الكلمات المفتاحية لا تتضمن مصطلحاً جغرافياً",
        current: keywords.slice(0, 100),
        suggestion: keywords + "، تأجير حاويات بالرياض، حاويات أنقاض شمال الرياض",
        reason: "الكلمات الجغرافية ضرورية لـ Local SEO وتحسين الظهور في البحث المحلي.",
      });
    }
  }

  // ── OG checks ─────────────────────────────────────────────────────────────
  if (!ogTitle.trim()) {
    suggestions.push({
      field: "ogTitle", impact: "medium",
      issue: "OG Title غير محدد — لن يظهر العنوان الصحيح عند المشاركة",
      current: "",
        suggestion: title || `${siteName} | تأجير الحاويات ونقل المخلفات بالرياض`,
      reason: "OG Title يُحدد كيف يظهر رابطك عند مشاركته على واتساب وتويتر وفيسبوك.",
    });
  }

  if (!ogDescription.trim()) {
    suggestions.push({
      field: "ogDescription", impact: "low",
      issue: "OG Description غير محدد",
      current: "",
      suggestion: description.slice(0, 200) || "متخصصون في تأجير حاويات المخلفات ونقل الأنقاض بالرياض. اتصل: 0536312121",
      reason: "يظهر كنص مصاحب للرابط عند المشاركة على وسائل التواصل الاجتماعي.",
    });
  }

  // ── Canonical checks ──────────────────────────────────────────────────────
  if (!canonicalUrl.trim()) {
    suggestions.push({
      field: "canonicalUrl", impact: "medium",
      issue: "Canonical URL غير محدد",
      current: "",
      suggestion: canonicalUrl || "/",
      reason: "Canonical يمنع مشكلة المحتوى المكرر ويُحدد الصفحة الأساسية لجوجل.",
    });
  } else if (!canonicalUrl.startsWith("https://")) {
    suggestions.push({
      field: "canonicalUrl", impact: "medium",
      issue: "Canonical URL لا يبدأ بـ HTTPS",
      current: canonicalUrl,
      suggestion: canonicalUrl.replace(/^http:\/\//, "https://"),
      reason: "يجب أن يُشير الـ Canonical دائماً للنسخة الآمنة HTTPS.",
    });
  }

  return suggestions;
}

// ── POST /api/admin/ai/suggest-seo ────────────────────────────────────────────
router.post("/admin/ai/suggest-seo", async (req, res) => {
  const {
    title = "", description = "", keywords = "",
    ogTitle = "", ogDescription = "", canonicalUrl = "",
  } = req.body as Record<string, string>;

  // 1. Always run local rule-based analysis
  const siteName = (await getSetting("company_name")).trim() || "الشركة";
  const localSuggestions = analyzeLocalSeo({ title, description, keywords, ogTitle, ogDescription, canonicalUrl, siteName });

  // 2. Try AI for richer suggestions — fallback to local if no key / network error
  try {
    const settings = await getAISettings();
    const hasKey = settings.geminiKey || settings.qwenKey || settings.zhipuKey;

    if (!hasKey) {
      // No AI keys configured — return local analysis only
      return res.json({ suggestions: localSuggestions, source: "local" });
    }

    const prompt = `
أنت خبير SEO متخصص في السوق السعودي. قم بتحليل البيانات الوصفية الحالية للموقع وقدم اقتراحات تحسين عملية وقابلة للتطبيق.

البيانات الحالية:
- العنوان (Title): ${title || "غير محدد"} [${title.length} حرف]
- الوصف (Description): ${description || "غير محدد"} [${description.length} حرف]
- الكلمات المفتاحية: ${keywords || "غير محددة"}
- OG Title: ${ogTitle || "غير محدد"}
- OG Description: ${ogDescription || "غير محدد"}
- Canonical URL: ${canonicalUrl || "غير محدد"}

المطلوب: قدم 3-5 اقتراحات تحسين إضافية (غير ما يتضمنه التحليل الأساسي بالفعل). ركز على:
- جودة النص وجاذبيته للمستخدم السعودي
- كلمات Long-tail مفيدة لم تُذكر في الكلمات الحالية
- توافق المحتوى مع نية البحث الشرائية
- أي تحسينات نوعية في الصياغة

لكل اقتراح:
- field: (title | description | keywords | ogTitle | ogDescription | canonicalUrl)
- issue, current, suggestion, impact (high|medium|low), reason

أجب بـ JSON صالح فقط:
{"suggestions":[{"field":"...","issue":"...","current":"...","suggestion":"...","impact":"high","reason":"..."}]}
`.trim();

    const raw = await callAI(prompt, 900, settings);
    const aiResult = extractJson(raw) as { suggestions?: SeoSuggestion[] };
    const aiSuggestions: SeoSuggestion[] = Array.isArray(aiResult.suggestions) ? aiResult.suggestions : [];

    // Merge: local first (rule-based), then AI extras
    const merged = [...localSuggestions];
    for (const s of aiSuggestions) {
      const alreadyCovered = merged.some(m => m.field === s.field && m.impact === "high");
      if (!alreadyCovered) merged.push(s);
    }

    return res.json({ suggestions: merged, source: "ai" });
  } catch {
    // AI failed — return local suggestions so the UI always gets something useful
    return res.json({ suggestions: localSuggestions, source: "local" });
  }
});

// ── POST /api/admin/ai/generate-llms-txt ──────────────────────────────────────
router.post("/admin/ai/generate-llms-txt", async (req, res) => {
  try {
    const settings = await getAISettings();

    // Get site settings for context
    const siteName   = (await getSetting("company_name")).trim() || "الشركة";
    const siteDesc   = await getSetting("site_desc")   || "متخصصون في تأجير الحاويات ونقل المخلفات بالرياض";
    const sitePhone  = await getSetting("company_phone_call")  || "";
    const siteEmail  = await getSetting("company_email")  || "";
    const siteUrl    = await getSetting("site_public_url")    ||
      (() => {
        const h = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() || req.headers.host || "";
        return h ? `https://${h.replace(/^https?:\/\//, "")}` : "";
      })();

    const prompt = `
أنت خبير في تحسين المواقع لمحركات البحث المعتمدة على الذكاء الاصطناعي (GEO - Generative Engine Optimization).
أنشئ ملف llms.txt لموقع ${siteName}. هذا الملف يساعد نماذج اللغة الكبيرة (ChatGPT, Gemini, Perplexity, Claude) على فهم الموقع بشكل أفضل.

معلومات الشركة:
- الاسم: ${siteName}
- الوصف: ${siteDesc}
- الهاتف: ${sitePhone}
- البريد: ${siteEmail || "غير محدد"}
- الموقع: ${siteUrl}
- المدينة: الرياض، المملكة العربية السعودية
- المجال: تأجير حاويات المخلفات ونقل الأنقاض

الخدمات الرئيسية:
- تأجير حاويات 12 و20 و40 ياردة
- نقل الأنقاض ومخلفات البناء
- خدمة 24 ساعة في الرياض
- تغطية جميع أحياء الرياض

أنشئ ملف llms.txt بصيغة Markdown احترافية يشمل:
1. # اسم الموقع
2. قسم "## نبذة" - وصف واضح وموجز
3. قسم "## الخدمات" - قائمة بالخدمات
4. قسم "## التغطية الجغرافية" - المناطق المخدومة
5. قسم "## معلومات الاتصال" - بيانات التواصل
6. قسم "## الأسئلة الشائعة" - 4-5 أسئلة مع أجوبة
7. قسم "## سياسة المحتوى" - توجيهات للذكاء الاصطناعي

أجب بـ JSON صالح فقط:
{
  "content": "# ${siteName}\\n\\n## نبذة\\n..."
}
`.trim();

    const raw = await callAI(prompt, 2000, settings);
    const result = extractJson(raw);
    return res.json(result);
  } catch (e) {
    return res.status(503).json({ error: String(e) });
  }
});

// ── POST /api/admin/llms-txt/save ─────────────────────────────────────────────
router.post("/admin/llms-txt/save", async (req, res) => {
  try {
    const { content } = req.body as { content?: string };
    if (!content?.trim()) return res.status(400).json({ error: "المحتوى فارغ" });

    // Save to the frontend public folder (served statically)
    const publicDir = resolve(__dirnameAiSeo, "../../../../../artifacts/sabaik-almasa/public");
    const filePath  = join(publicDir, "llms.txt");
    await writeFile(filePath, content, "utf-8");

    return res.json({ ok: true, savedTo: "public/llms.txt", size: content.length });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// ── POST /api/admin/ai/test ─────────────────────────────────────────────────────
router.post("/admin/ai/test", async (req, res) => {
  const { provider } = req.body as { provider: string };
  const geminiKey  = await getSetting("ai_gemini_key");
  const qwenKey    = await getSetting("ai_qwen_key");
  const qwenHost   = await getSetting("ai_qwen_host");
  const qwenModel  = await getSetting("ai_qwen_model");
  const zhipuKey   = await getSetting("ai_zhipu_key");

  const testPrompt = 'قل "الاتصال ناجح" فقط.';
  try {
    if (provider === "gemini")  await callGemini(geminiKey, testPrompt);
    if (provider === "qwen")    await callQwen(qwenKey, qwenHost, testPrompt, qwenModel);
    if (provider === "zhipu")   await callZhipu(zhipuKey, testPrompt);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, error: String(e) });
  }
});

export default router;
