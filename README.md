# TTB Playwright Artifact Project

TR ve EN crawl artifact'lerini Playwright testlerinde kullanmak için hazırlanmış örnek proje.

## 1. Ortam ayarı

`.env` içindeki `HOSTNAME` değerini değiştirin:

```env
HOSTNAME=uat-turkticaretbankasi.ttbank.local
```

Artifact dosyalarındaki:

```text
https://{{hostname}}/tr/...
https://{{hostname}}/en/...
```

ifadeleri test çalışırken otomatik olarak `.env` değerine çevrilir. Artifact JSON dosyaları fiziksel olarak değiştirilmez.

> `HOSTNAME` alanına `https://` yazmanız gerekmez. Yazarsanız kod otomatik temizler.

## 2. Kurulum

```bash
npm install
npx playwright install chromium
```

## 3. Testler

Artifact yapısını ve hostname çözümlemeyi kontrol et:

```bash
npm run test:inventory
```

TR + EN crawl içindeki ziyaret edilmiş URL'lerin HTTP sağlığını kontrol et:

```bash
npm run test:health
```

TR + EN crawl içinde keşfedilmiş PDF'leri kontrol et:

```bash
npm run test:pdf
```

Tüm testleri çalıştır:

```bash
npm test
```

HTML rapor:

```bash
npm run report
```

## 4. Proje yapısı

```text
artifacts/
  tr-crawl-state.json
  en-crawl-state.json
src/
  config/
    env.ts
  types/
    crawl-state.ts
  utils/
    artifact-loader.ts
    url.ts
tests/
  artifacts/
    artifact-inventory.spec.ts
    url-health.spec.ts
    pdf-validation.spec.ts
.env
playwright.config.ts
package.json
tsconfig.json
```

## 5. Mevcut artifact özeti

| Dil | Discovered | Visited | Pending | PDF | External | Excluded | Error |
|---|---:|---:|---:|---:|---:|---:|---:|
| TR | 222 | 222 | 0 | 110 | 31 | 2 | 18 |
| EN | 130 | 130 | 0 | 72 | 28 | 12 | 1 |

`url-health.spec.ts` mevcut 404 gibi sorunları test failure olarak gösterebilir; bu beklenen davranıştır ve crawl çıktısındaki problemleri yeniden doğrulamak içindir.

## 6. Güvenlik

`.env` `.gitignore` içindedir. Repository'ye gerçek ortam ayarlarını commit etmeyin.
Crawl artifact'lerine token, cookie, Authorization header veya hassas request payload eklemeyin.
