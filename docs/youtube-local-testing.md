# YouTube Dizi & Film — yerel test

Bu değişiklikler yereldir. Commit/push veya dağıtım yapılmadı. Yerel sürüm
`1.8.27`; paket, kilit dosyası, config, depo manifesti ve YouTube sağlayıcısı
sürümleri eşitlendi. Diğer sağlayıcıların sürümleri değiştirilmedi.

Kaynak adlarının sonunda geçici `BETA 1.8.27` işareti görünür. Bu işaret
yerel test kodunun yüklendiğini ayırt etmek içindir.

## Davranış

- `getStreams` varsayılan olarak yalnızca doğrudan HLS/MP4 medya döndürür.
  Çözümlenemeyen içerik Nuvio için boş liste verir; HTML sayfası veya embed
  seçeneği yerel oynatıcıya gönderilmez.
- Stremio adaptörü isterse `getStreams({ id, type, client: 'stremio' })` ile
  ayrıca URL'siz `ytId` alabilir. Bu alan Stremio protokolünün otomatik gönderdiği
  bir alan değildir; adaptörün eklemesi gerekir. Mevcut statik canlı TV Stremio
  deposuna yeni bir YouTube hizmeti eklenmedi.
- Safari WEB ve mevcut ANDROID istemcileri paralel denenir. Başarılı player
  yanıtı sonrasında HLS listesi veya küçük MP4 medya isteği kontrol edilir.
- HLS: manifestten gerçek çözünürlük okunur; AVC/H.264 + AAC-LC, en fazla
  1080p ve bildirildiğinde en fazla 30 FPS seçilir. En yüksek uygun varyant ve
  varsa 720p veya altındaki alternatif döner. Bunlar sabit varyantlardır;
  otomatik kalite/fallback garantisi yoktur.
- Ayrı AUDIO URI'sine bağlı HLS varyantları, ses grubunu kaybetmemek için
  şu an elenir. Manifest yeniden yazma/servis etme uygulanmadı. Codec veya
  çözünürlük bilgisi olmayan, şifreli veya sadece ses içeren listeler de elenir.
- MP4: yalnızca `formats` içindeki açık URL'li, H.264 + AAC sesli biçimler
  kullanılır. `adaptiveFormats` içindeki sessiz video akışları, şifreli imzalar
  ve uyumsuz codec'ler atlanır. CDN GET isteği HTML/403 verirse kaynak elenir.
- MP4 kontrolü küçük aralık isteği ve medya başlıklarıyla yapılır; HLS kontrolü
  liste içeriğiyle yapılır. Çalışma anında tam video indirilmez. Gerçek ses/video
  izlerinin bağımsız kontrolü canlı test betiğinde FFprobe ile yapılır.
- Config dahil getStreams için 9 saniyelik bütçe vardır. Yanıt gövdesi de süreye
  dahildir. AbortController olmayan ortamlarda promise zaman aşımı döner;
  alttaki HTTP isteğinin fiziksel iptali çalışma ortamının desteğine bağlıdır.
- En fazla iki arama sorgusu paralel çalışır. Kanal abone sayısı için HTTP
  isteği yoktur. TMDB'den sadece gerekli başlık/sezon bilgisi alınır.

## Tekrar çalıştırma

Gereksinimler: Node.js ve kurulu proje bağımlılıkları; canlı medya kontrolü
ayrıca FFprobe ve YouTube/TMDB ağ erişimi ister.

```sh
node build.js youtube_dizifilm
npm run test:youtube
npm run test:youtube:live
npm run test:addon
```

Belirli bir video için:

```sh
node scripts/test_youtube_live.js --live VIDEO_ID
```

Canlı test sonuçları `docs/youtube-local-results.json` dosyasına yazılır.
İmzalı medya URL'leri, sorgu dizeleri ve API anahtarları rapora yazılmaz.
`ytId`, oynatma başarısı olarak sayılmaz. Video VE ses izi yoksa test başarısızdır.

## Bu bilgisayarda alınan sonuçlar — 4 Ekim 2026

- 23 otomatik test geçti: HLS kalite/ses kontrolü, HTML/403, codec/cipher eleme,
  yavaş gövde/config, zaman aşımı, yanlış bölüm/yan yapım, sürüm senkronizasyonu.
- Derlenmiş bundle Node modülleri, URL, Buffer ve AbortController sağlanmayan
  bir VM'de çalıştı. Bu test gerçek QuickJS/Nuvio cihaz testi değildir.
- Statik Stremio bütünlük testi geçti (mevcut canlı TV kataloğu).
- Canlı test: Big Buck Bunny, Kurtlar Vadisi S01E01 ve Tosun Paşa sorgularının
  döndürdüğü 5 medya kaynağının tamamında FFprobe H.264 görüntü + AAC ses gördü.
  Hepsi 640×360 idi. Akış çözümleme süreleri yaklaşık 0,39 / 0,97 / 0,70 saniye;
  bunlar FFprobe süresi ve oynatıcının ilk kare süresi değildir.
- Bu ağda WEB/Safari isteği oynatılabilir HLS vermedi. ANDROID itag 18 verdi.
  HLS/HD yolu fixture testlerinden geçti; gerçek YouTube HD oynatımı doğrulanmadı.

## Telefonda / TV'de yerel paket denemesi

Bilgisayarda yalnızca YouTube manifestini ve derlenmiş sağlayıcıyı sunan sunucu:

```sh
npm run serve:youtube
```

Bu komut varsayılan olarak yalnızca `127.0.0.1:3001` üzerinde çalışır.
Telefon/TV aynı yerel ağdaysa önce önceki sunucuyu Ctrl+C ile kapatıp çalıştırın:

```sh
npm run serve:youtube -- --lan
```

Konsolda yazılan `http://BILGISAYARIN_YEREL_IP_ADRESI:3001/manifest.json`
adresini Nuvio'nun eklenti deposu alanına ekleyin. Telefondaki `localhost`
bilgisayarı göstermez. Bazı uygulama sürümleri HTTP depo adreslerini kabul
etmeyebilir; bu cihaz/sürüm üzerinde ayrıca doğrulanmalıdır. Eski sağlayıcı
kopyasıyla karışmaması için testte yerel 1.8.27 sürümünün yüklendiğini kontrol edin.
Sunucu sadece iki dosyayı sunar; depo dizinini veya `.git` içeriğini sunmaz.

| Ortam | Gerekli kontrol | Durum |
| --- | --- | --- |
| Android telefon / Nuvio | Ses, görüntü, ileri sarma, 5 dakika oynatma | Bekliyor |
| Android TV / Nuvio | Aynı kontroller + kumandayla kaynak değiştirme | Bekliyor |
| iOS / hedef uygulama | Aynı kontroller + eklenti/API uyumluluğu | Bekliyor |
| Stremio hedef sürümü | Medya ve isteğe bağlı ytId davranışı | Bekliyor |

Cihaz testleri ve gerçek HD testi tamamlanmadan “tüm cihazlarda çalışıyor” veya
“1080p hazır” iddiasıyla yayımlanmamalıdır. YouTube'un oturum/token ve istemci
politikaları değişebildiği için bugün çalışan CDN erişimi kalıcı garanti değildir.
