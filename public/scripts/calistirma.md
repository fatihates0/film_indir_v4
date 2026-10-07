# Storage Gateway Node Kurulumu

Yeni bir depolama sunucusunda Gateway Proxy altyapısını kurmak için:

```bash
curl -sSL https://movie.fatihates.com.tr/scripts/gateway_setup.sh | sudo bash
```

### Yardımcı Araçlar

```bash
# Ses parçası etiketlerini düzenleme:
curl -sSL https://movie.fatihates.com.tr/scripts/update_audio_titles.sh | sudo bash

# Medya dosyalarını standart isimlendirme:
curl -sSL https://movie.fatihates.com.tr/scripts/rename_media.sh | sudo bash
```