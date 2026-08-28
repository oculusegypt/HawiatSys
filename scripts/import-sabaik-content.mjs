import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.resolve(rootDir, "data");
const transferDir = path.resolve(rootDir, "sabaik-content-transfer-2026-08-17/sabaik-content-transfer-2026-08-17/data");

const dbPath = path.join(dataDir, "sabaik.db");
const db = new Database(dbPath);
db.pragma("foreign_keys = OFF");

console.log("=== Starting CleanFlow Content Import ===");

// 1. Import Settings
try {
  const settingsFile = path.join(transferDir, "site-settings.json");
  if (fs.existsSync(settingsFile)) {
    const settingsData = JSON.parse(fs.readFileSync(settingsFile, "utf-8"));
    const records = settingsData.records || [];
    console.log(`Importing ${records.length} site settings...`);

    const insertSetting = db.prepare(`
      INSERT INTO site_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);

    const tx = db.transaction(() => {
      for (const item of records) {
        insertSetting.run(item.key, typeof item.value === 'string' ? item.value : JSON.stringify(item.value));
      }
    });
    tx();
    console.log("✓ Site settings imported.");
  }
} catch (err) {
  console.error("Error importing site settings:", err);
}

// 2. Import Containers (packages table)
try {
  const containersFile = path.join(transferDir, "containers.json");
  if (fs.existsSync(containersFile)) {
    const containersData = JSON.parse(fs.readFileSync(containersFile, "utf-8"));
    const records = containersData.records || [];
    console.log(`Importing ${records.length} containers...`);

    db.exec("DELETE FROM packages");

    const insertContainer = db.prepare(`
      INSERT INTO packages (
        id, name, category, size, capacity, description, features,
        suitable_for, price_text, price_note, rental_period,
        contact_phone1, contact_phone2, price_per_day,
        image_url, images, "order", is_active,
        seo_enabled, seo_title, seo_description, seo_keywords, seo_slug
      ) VALUES (
        @id, @name, @category, @size, @capacity, @description, @features,
        @suitableFor, @priceText, @priceNote, @rentalPeriod,
        @contactPhone1, @contactPhone2, @pricePerDay,
        @imageUrl, @images, @order, @isActive,
        @seoEnabled, @seoTitle, @seoDescription, @seoKeywords, @seoSlug
      )
    `);

    const tx = db.transaction(() => {
      for (const item of records) {
        insertContainer.run({
          id: item.id,
          name: item.name,
          category: item.category || "debris",
          size: item.size || "",
          capacity: item.capacity || "",
          description: item.description || "",
          features: JSON.stringify(item.features || []),
          suitableFor: item.suitableFor || "",
          priceText: item.priceText || "",
          priceNote: item.priceNote || "",
          rentalPeriod: item.rentalPeriod || "",
          contactPhone1: item.contactPhone1 || "",
          contactPhone2: item.contactPhone2 || "",
          pricePerDay: Number(item.pricePerDay) || 0,
          imageUrl: item.imageUrl || "",
          images: JSON.stringify(item.images || []),
          order: item.order ?? 0,
          isActive: item.isActive !== false ? 1 : 0,
          seoEnabled: item.seoEnabled ? 1 : 0,
          seoTitle: item.seoTitle || "",
          seoDescription: item.seoDescription || "",
          seoKeywords: item.seoKeywords || "",
          seoSlug: item.seoSlug || ""
        });
      }
    });
    tx();
    console.log("✓ Containers imported successfully into packages table.");
  }
} catch (err) {
  console.error("Error importing containers:", err);
}

// 3. Import Services & Reviews
try {
  const servicesFile = path.join(transferDir, "services.json");
  if (fs.existsSync(servicesFile)) {
    const servicesData = JSON.parse(fs.readFileSync(servicesFile, "utf-8"));
    const records = servicesData.records || [];
    console.log(`Importing ${records.length} services...`);

    db.exec("DELETE FROM reviews");
    db.exec("DELETE FROM services");

    const insertService = db.prepare(`
      INSERT INTO services (
        id, title, description, icon, image_url, images,
        "order", is_active, seo_enabled, seo_title,
        seo_description, seo_keywords, seo_slug
      ) VALUES (
        @id, @title, @description, @icon, @imageUrl, @images,
        @order, @isActive, @seoEnabled, @seoTitle,
        @seoDescription, @seoKeywords, @seoSlug
      )
    `);

    const tx = db.transaction(() => {
      for (const item of records) {
        insertService.run({
          id: item.id,
          title: item.title,
          description: item.description || "",
          icon: item.icon || "Box",
          imageUrl: item.imageUrl || "",
          images: JSON.stringify(item.images || [item.imageUrl].filter(Boolean)),
          order: item.order ?? 0,
          isActive: item.isActive !== false ? 1 : 0,
          seoEnabled: item.seoEnabled ? 1 : 0,
          seoTitle: item.seoTitle || "",
          seoDescription: item.seoDescription || "",
          seoKeywords: item.seoKeywords || "",
          seoSlug: item.seoSlug || ""
        });
      }
    });
    tx();
    console.log("✓ Services imported successfully.");
  }
} catch (err) {
  console.error("Error importing services:", err);
}

// 4. Import Articles (posts table)
try {
  const articlesFile = path.join(transferDir, "articles.json");
  if (fs.existsSync(articlesFile)) {
    const articlesData = JSON.parse(fs.readFileSync(articlesFile, "utf-8"));
    const records = articlesData.records || [];
    console.log(`Importing ${records.length} articles...`);

    db.exec("DELETE FROM posts");

    const insertPost = db.prepare(`
      INSERT INTO posts (
        id, title, slug, content, excerpt, cover_image,
        author, category, tags, status, published_at,
        read_time, view_count, is_active, "order",
        seo_title, seo_description, seo_keywords, seo_slug,
        og_image, canonical_url, created_at, updated_at
      ) VALUES (
        @id, @title, @slug, @content, @excerpt, @coverImage,
        @author, @category, @tags, @status, @publishedAt,
        @readTime, @viewCount, @isActive, @order,
        @seoTitle, @seoDescription, @seoKeywords, @seoSlug,
        @ogImage, @canonicalUrl, @createdAt, @updatedAt
      )
    `);

    const tx = db.transaction(() => {
      for (const item of records) {
        insertPost.run({
          id: item.id,
          title: item.title,
          slug: item.slug,
          content: item.content || "",
          excerpt: item.excerpt || "",
          coverImage: item.coverImage || "",
          author: item.author || "مؤسسة تقي جروب",
          category: item.category || "عام",
          tags: typeof item.tags === "string" ? item.tags : JSON.stringify(item.tags || []),
          status: item.status || "published",
          publishedAt: item.publishedAt || new Date().toISOString(),
          readTime: Number(item.readTime) || 4,
          viewCount: Number(item.viewCount) || 0,
          isActive: item.isActive !== false ? 1 : 0,
          order: item.order ?? 0,
          seoTitle: item.seoTitle || item.title,
          seoDescription: item.seoDescription || item.excerpt || "",
          seoKeywords: item.seoKeywords || "",
          seoSlug: item.seoSlug || item.slug,
          ogImage: item.ogImage || item.coverImage || "",
          canonicalUrl: item.canonicalUrl || "",
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        });
      }
    });
    tx();
    console.log("✓ Articles imported successfully into posts table.");
  }
} catch (err) {
  console.error("Error importing articles:", err);
}

// 5. Import Pages (seo_pages table)
try {
  const pagesFile = path.join(transferDir, "pages.json");
  if (fs.existsSync(pagesFile)) {
    const pagesData = JSON.parse(fs.readFileSync(pagesFile, "utf-8"));
    const records = pagesData.records || [];
    console.log(`Importing ${records.length} pages...`);

    db.exec("DELETE FROM seo_pages");

    const insertPage = db.prepare(`
      INSERT INTO seo_pages (
        id, title, slug, target_keyword, content, excerpt,
        cover_image, category, tags, status, published_at,
        view_count, is_active, "order",
        seo_title, seo_description, seo_keywords, seo_slug,
        og_image, canonical_url, created_at, updated_at
      ) VALUES (
        @id, @title, @slug, @targetKeyword, @content, @excerpt,
        @coverImage, @category, @tags, @status, @publishedAt,
        @viewCount, @isActive, @order,
        @seoTitle, @seoDescription, @seoKeywords, @seoSlug,
        @ogImage, @canonicalUrl, @createdAt, @updatedAt
      )
    `);

    const tx = db.transaction(() => {
      for (const item of records) {
        insertPage.run({
          id: item.id,
          title: item.title,
          slug: item.slug,
          targetKeyword: item.seoKeywords || item.title,
          content: item.content || "",
          excerpt: item.excerpt || "",
          coverImage: item.heroImage || "",
          category: item.pageType || "حاويات",
          tags: JSON.stringify(item.faq || []),
          status: item.status || "published",
          publishedAt: item.publishedAt || new Date().toISOString(),
          viewCount: 0,
          isActive: item.isActive !== false ? 1 : 0,
          order: item.order ?? 0,
          seoTitle: item.seoTitle || item.title,
          seoDescription: item.seoDescription || item.excerpt || "",
          seoKeywords: item.seoKeywords || "",
          seoSlug: item.seoSlug || item.slug,
          ogImage: item.ogImage || "",
          canonicalUrl: item.canonicalUrl || "",
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString()
        });
      }
    });
    tx();
    console.log("✓ Pages imported successfully into seo_pages table.");
  }
} catch (err) {
  console.error("Error importing pages:", err);
}

// 6. Update Testimonials, Values, Partners, Slides to Taqi Group
try {
  db.exec(`
    DELETE FROM testimonials;
    INSERT INTO testimonials (client_name, company, content, rating, is_active, created_at) VALUES
    ('م. فهد السبيعي', 'مدير مشاريع إنشائية', 'تعاملنا مع مؤسسة تقي جروب في عدة مشاريع كبرى بالرياض، التزام رائع في مواعيد تسليم الحاويات وسحبها فور الامتلاء وسرعة استجابة لا مثيل لها.', 5, 1, datetime('now')),
    ('أبو راشد القحطاني', 'صاحب فيلا - حي النرجس', 'طلبت حاوية 15 ياردة لأعمال الترميم، وصلت في نفس اليوم وتم سحبها بكل سهولة، أسعارهم مناسبة جداً وخدمة راقية.', 5, 1, datetime('now')),
    ('شركة إعمار نجد للمقاولات', 'إدارة المشاريع', 'شريك لوجستي ممتاز لإدارة مخلفات البناء والهدم. أسطول حديث وتنسيق مستمر دون أي تأخير.', 5, 1, datetime('now')),
    ('سلطان الشمري', 'صاحب مجمع مطاعم', 'عقد النظافة وتأجير مكبس النفايات سهل علينا الكثير وضمن لنا الامتثال لجميع اشتراطات أمانة الرياض.', 5, 1, datetime('now'));

    DELETE FROM hero_slides;
    INSERT INTO hero_slides (title, subtitle, image_url, cta_text, "order", is_active, created_at) VALUES
    ('تأجير حاويات المخلفات والأنقاض بالرياض', 'حاويات 6 إلى 30 ياردة للمشاريع السكنية والتجارية مع سرعة في التوصيل والسحب 24/7', '/images/hero-1.webp', 'اطلب حاويتك الآن', 0, 1, datetime('now')),
    ('نقل مخلفات الهدم والبناء بأعلى معايير السلامة', 'أسطول شاحنات حديث مجهز لخدمة جميع أحياء الرياض بأسعار تنافسية', '/images/hero-2.webp', 'احجز موعد فوري', 1, 1, datetime('now')),
    ('عقود نظافة معتمدة ومكابس نفايات ذكية', 'حلول متكاملة للمنشآت والمطاعم والمصانع لتجديد الرخص وتفريغ منتظم', '/images/hero-3.webp', 'تواصل معنا', 2, 1, datetime('now'));

    DELETE FROM company_values;
    INSERT INTO company_values (title, description, icon, "order") VALUES
    ('السرعة والالتزام بالمواعيد', 'توصيل الحاويات وسحبها خلال 2 إلى 4 ساعات على مدار الساعة طوال أيام الأسبوع.', 'Clock', 0),
    ('أسطول شاحنات حديث ومتنوع', 'حاويات بمختلف المقاسات من 6 إلى 30 ياردة ومكابس نفايات هيدروليكية متطورة.', 'Truck', 1),
    ('الامتثال البيئي والتراخيص', 'عقود معتمدة لدى أمانة الرياض وتفريغ النفايات في المكبات الرسمية المعتمدة.', 'ShieldCheck', 2),
    ('أسعار تنافسية وشفافة', 'أسعار واضحة بدون رسوم خفية مع خصومات خاصة للمقاولين والعقود الدورية.', 'DollarSign', 3);

    DELETE FROM partners;
    INSERT INTO partners (name, logo_url, website_url, "order", is_active) VALUES
    ('شريك موثوق 1', '/images/partner-1.jpg', '', 0, 1),
    ('شريك موثوق 2', '/images/partner-2.jpg', '', 1, 1),
    ('شريك موثوق 3', '/images/partner-3.jpg', '', 2, 1),
    ('شريك موثوق 4', '/images/partner-4.jpg', '', 3, 1),
    ('شريك موثوق 5', '/images/partner-5.jpg', '', 4, 1),
    ('شريك موثوق 6', '/images/partner-6.jpg', '', 5, 1);
  `);
  console.log("✓ Testimonials, Hero Slides, Company Values, and Partners updated.");
} catch (err) {
  console.error("Error updating testimonials/slides:", err);
}

db.pragma("foreign_keys = ON");
console.log("=== Import Complete! ===");
