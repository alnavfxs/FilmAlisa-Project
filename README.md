# Filmalisa

Film arama platformu: kullanıcı tarafı (client) ve admin paneli. Saf **HTML / CSS / JavaScript** (build adımı yoktur), veriler hazır bir REST API'den gelmektedir.

## Özellikler

**Kullanıcı**
- Kayıt ol / Giriş yap, profil (ad, görsel, şifre)
- Ana sayfa: otomatik değişen hero slaytı ve kategorilere göre film sıraları (ok tuşları, sürükleme / kaydırma - drag / swipe)
- Film detayı: bilgi, oyuncular, fragman modalı (YouTube / doğrudan video), yorumlar, benzer filmler
- Arama ve favoriler listesi

**Admin Paneli**
- Dashboard istatistikleri
- Filmler, kategoriler, oyuncular üzerinde CRUD işlemleri
- Kullanıcılar, yorumlar ve iletişim mesajlarının yönetimi

## Mobil Tasarım

Client sayfaları (`home`, `search`, `favourite`, `detail`, `account`, `404`), `global/css/layout/mobile.css` dosyası ile Figma mobil şablonuna tamamen uygundur:

- `≤900px` — Kenar çubuğu (sidebar) alt sekme çubuğuna (tab bar: ikon + yazı) dönüşür.
- `≤600px` — Telefon tasarımı: home (üst bar, tam ekran hero, beyaz Play düğmesi, küçük poster sıraları), search ("Movies & TV" listesi, `Cancel`, 3 sütunlu sonuçlar), detail (yukarıda fragman, tam genişlikte Play, My List).

## Kurulum

Build gerektirmez. Projeyi bir **yerel sunucu (local server)** ile açın (`file://` protokolü ile API istekleri çalışmayabilir):

- VS Code → *Live Server* → `index.html`, veya
- `npx serve .` / `python3 -m http.server 8000`

Giriş Noktaları:

| Sayfa | Yol (Path) |
| --- | --- |
| Landing (Karşılama) | `index.html` |
| Kullanıcı Girişi | `client/login/login.html` |
| Admin Girişi | `admin/admin_panel/admin_panel.html` |

## Proje Yapısı

index.html              Landing sayfası (style/style.css)
client/                 Kullanıcı sayfaları (home, detail, search-panel, favourite, account, login, register)
admin/                  Admin sayfaları (dashboard, movies, categories, actors, users, comments, contact)
global/
css/
global.css            Giriş noktası: tek dosya: reset + tasarım tokenleri + body + movie-card + toast + confirm-dialog + autofill (HTML'de  ile bağlanır, @import yoktur)
components/           neon-title, admin-modal, admin-pagination, admin-ui, text-popover
layout/               admin-layout, app-sidebar, mobile (duyarlı / responsive)
js/
core/api.js           API katmanı: istek, token/oturum, hata yönetimi, toast, confirmDialog
components/           layout (ortak sidebar), movie-ui (film kartı, yıldızlar), admin-pagination, text-popover
pages/landing.js      Landing header (Sign in / profil menüsü), İletişim formu
assets/                 Görseller ve ikonlar


## Mimari Notlar

- Tüm ağ istekleri `global/js/core/api.js` üzerinden geçer (`api.*` / `api.admin.*`). Rol (client/admin) istek yoluna göre seçilir; `401` yanıtı alındığında oturum temizlenir ve kullanıcı giriş sayfasına yönlendirilir.
- Sayfalar betikleri şu sırayla yükler: `api.js` → `layout.js` → `movie-ui.js` / `admin-pagination.js` → sayfanın kendi JS dosyası.
- Kullanıcıdan veya API'den gelen metinler HTML'e yazılırken **her zaman** `esc()` fonksiyonu ile escape edilir (güvenlik için).
- Güvenlik Koruması: client sayfaları `requireClientAuth()`, admin sayfaları ise `requireAuth("admin")` ile açılır. Bu yalnızca bir UX korumasıdır; gerçek yetkilendirme kontrolü sunucuda (backend) yapılır.

## Bilinen Sınırlamalar

- Token `localStorage` içinde saklanır (backend `HttpOnly` cookie desteklemiyor).
- Profil resmi (dosya yükleme) yalnızca ilgili tarayıcıda saklanır, sunucu yalnızca görsel bağlantısını (link) kabul eder.
- Landing sayfasındaki TV animasyonu harici bir barındırıcıdan (`filmalisa-green.vercel.app`) yüklenir.