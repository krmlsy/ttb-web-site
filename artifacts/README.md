# Crawl Artifacts

Bu klasörde kullanıcı tarafından sağlanan crawl çıktıları **değiştirilmeden** tutulur:

- `tr-crawl-state.json`
- `en-crawl-state.json`

Artifact URL'leri `https://{{hostname}}/...` formatındadır.
Runtime sırasında `src/utils/artifact-loader.ts`, `{{hostname}}` değerini `.env` içindeki `HOSTNAME` ile değiştirir.

Bu sayede artifact dosyalarını UAT / PREPROD / başka bir host için değiştirmeye gerek kalmaz.
