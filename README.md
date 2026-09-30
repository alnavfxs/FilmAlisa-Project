# Filmalisa

Film axtarış platforması: istifadəçi tərəfi (client) və admin panel. Saf **HTML / CSS / JavaScript** (build addımı yoxdur), məlumat hazır REST API-dən gəlir.

## Xüsusiyyətlər

**İstifadəçi**
- Qeydiyyat / giriş, profil (ad, şəkil, parol)
- Ana səhifə: avtomatik dəyişən hero slaydı və kateqoriyalara görə film sıraları (ox düymələri, drag / swipe)
- Film detalı: məlumat, aktyorlar, fragman modalı (YouTube / birbaşa video), şərhlər, oxşar filmlər
- Axtarış və sevimlilər siyahısı

**Admin panel**
- Dashboard statistikası
- Filmlər, kateqoriyalar, aktyorlar üzərində CRUD
- İstifadəçilər, şərhlər və əlaqə mesajlarının idarəsi

## Mobil dizayn

Client səhifələri (home, search, favourite, detail, account, 404) `global/css/layout/mobile.css` ilə Figma mobil şablonuna uyğundur:

- `≤900px` — sidebar aşağı tab bara çevrilir (ikon + yazı)
- `≤600px` — telefon dizaynı: home (üst bar, tam ekran hero, ağ Play düyməsi, kiçik poster sıraları), search ("Movies & TV" siyahısı, `Cancel`, 3 sütunlu nəticə), detail (yuxarıda fragman, tam enli Play, My List)


## Quraşdırma

Build tələb olunmur. Layihəni **lokal server** ilə aç (`file://` ilə API sorğuları işləməyə bilər):

- VS Code → *Live Server* → `index.html`, və ya
- `npx serve .` / `python3 -m http.server 8000`

Giriş nöqtələri:

| Səhifə | Yol |
| --- | --- |
| Landing | `index.html` |
| İstifadəçi girişi | `client/login/login.html` |
| Admin girişi | `admin/admin_panel/admin_panel.html` |

## Struktur

```
index.html              Landing səhifəsi (style/style.css)
client/                 İstifadəçi səhifələri (home, detail, search-panel, favourite, account, login, register)
admin/                  Admin səhifələri (dashboard, movies, categories, actors, users, comments, contact)
global/
  css/
    global.css            Giriş nöqtəsi: bütün səhifələr yalnız bunu import edir
    base/                 reset, variables (dizayn tokenləri), body, autofill
    components/           movie-card, toast, confirm-dialog, neon-title, admin-modal, admin-pagination, admin-ui, text-popover
    layout/               admin-layout, app-sidebar, mobile (responsiv)
  js/
    core/api.js           API qatı: sorğu, token/sessiya, xəta idarəsi, toast, confirmDialog
    components/           layout (ortaq sidebar), movie-ui (film kartı, ulduzlar), admin-pagination, text-popover
    pages/landing.js      Landing header (Sign in / profil menyusu), Contact formu
    data/movies-data.js   Köhnə statik film datası (hazırda heç bir səhifə istifadə etmir)
assets/                 Şəkillər və ikonlar
```

## Arxitektura qeydləri

- Bütün şəbəkə sorğuları `global/js/core/api.js` üzərindən keçir (`api.*` / `api.admin.*`). Rol (client/admin) sorğu yoluna görə seçilir, `401` cavabında sessiya təmizlənib login səhifəsinə yönləndirilir.
- Səhifələr skriptləri bu ardıcıllıqla yükləyir: `api.js` → `layout.js` → `movie-ui.js` / `admin-pagination.js` → səhifənin öz JS-i.
- İstifadəçidən və ya API-dən gələn mətn HTML-ə yazılanda **həmişə** `esc()` ilə escape olunur.
- Qoruma: client səhifələri `requireClientAuth()`, admin səhifələri `requireAuth("admin")` ilə açılır. Bu yalnız UX qoruması; real icazə nəzarəti serverdədir.

## Məlum məhdudiyyətlər

- Token `localStorage`-da saxlanılır (backend `HttpOnly` cookie dəstəkləmir).
- Profil şəkli (fayl yükləmə) yalnız həmin brauzerdə saxlanılır, server yalnız şəkil linki qəbul edir.
- Landing-dəki TV animasiyası xarici host-dan (`filmalisa-green.vercel.app`) yüklənir.
