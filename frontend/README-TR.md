# Frontend Books TR

# pnpm Monorepo Workspace Kullanımı ve Sık Karşılaşılan Senaryolar (Proje Rehberi)

Bu doküman, projenin kurulumundan paket ekleme, silme, workspace yönetimi ve peer dependency süreçlerine kadar pnpm monorepo kullanımını, sık yapılan işlemler ve alınacak aksiyonlar ile adım adım açıklar.

---

## 1. Proje Workspace ve pnpm Başlangıç Kurulumu

### Node.js & Corepack Kurulumu

* Minimum Node.js: 18.x (yeni projeler için önerilir)
* Corepack’i etkinleştir ve pnpm’i kur:

```bash
corepack enable
corepack prepare pnpm@10.11.0 --activate  # veya pnpm@latest
pnpm -v
```

### Repo Klonlama & pnpm Workspace Kurulumu

```bash
git clone <repo-url>
cd frontend # proje kökü
yada ana dizin
```

### pnpm-workspace.yaml

Proje köküne şu dosyayı oluşturun:

```yaml
packages:
  - "game-engine"
  - "game-types/*"
  - "games/*"
```

* Bu dosya, workspace’in ana rehberidir. Eksik veya yanlışsa workspace fonksiyonları çalışmaz.

### package.json (root dosyası)

Kökte şu şekilde olmalı:

```json
{
  "name": "frontend-workspace",
  "private": true,
  "workspaces": [
    "game-engine",
    "game-types/*",
    "games/*"
  ],
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint"
  },
  "packageManager": "pnpm@10.11.0"
}
```

---

## 2. Workspace’te Paket Ekleme ve Silme Senaryoları

### Paket Ekleme

#### Otomatik (pnpm ile)

* İlgili pakete özel ekleme:

  ```bash
  cd games/local-test-v0
  pnpm add <package-ismi>
  ```
* Tüm projeler için (ortak):

  ```bash
  cd frontend
  pnpm add -w <package-ismi>
  ```
* Bu işlemler pnpm-lock.yaml ve node\_modules’u otomatik günceller.

#### Manuel (El ile package.json’a ekleme)

* Sadece elle ekleme yaptıysan:

  ```bash
  pnpm install
  ```
* pnpm, gereksiz bağımlılıkları ve node\_modules’u otomatik senkronize eder.

### Paket Silme

#### Otomatik (pnpm remove ile)

* Bağımlılığı kaldırmak için:

  ```bash
  cd ilgili-paket
  pnpm remove <package-ismi>
  ```
* Hem package.json hem node\_modules hem de pnpm-lock.yaml otomatik temizlenir.

#### Manuel (El ile package.json’dan silme)

* Elle sildiysen, ardından:

  ```bash
  pnpm install
  ```
* pnpm, gereksiz dosya ve bağımlılıkları otomatik olarak temizler (prune eder).

#### Tam Temizlik

* Nadiren gerekirse:

  ```bash
  rm -rf node_modules pnpm-lock.yaml
  pnpm install
  ```

---

## 3. Workspace’teki Bir Paketi (Örneğin Engine) Local Projeye Eklemek

Aşağıda workspace’inizde bulunan bir paketi (örneğin `game-engine`) bir oyun projesine nasıl ekleyeceğiniz iki farklı yöntemle açıklanmıştır:

---

### Terminal Komutu ile Workspace Paketi Ekleme

```bash
cd games/my-new-game
pnpm add game-engine --workspace
```

* Bu komut, projenin package.json dosyasına şunu ekler:

  ```json
  "dependencies": {
    "game-engine": "workspace:*"
  }
  ```
* `workspace:*` ifadesi, pnpm’in local workspace içindeki paketi otomatik olarak symlink’le bağlamasını sağlar.
* Kodunda doğrudan kullanabilirsin:

  ```ts
  import { Game } from "game-engine";
  ```

---

### Elle (Manuel) Bağlama

* Projenin package.json dosyasına aşağıdaki satırı ekle:

  ```json
  "dependencies": {
    "game-engine": "workspace:*"
  }
  ```
* Ardından kök dizinde (frontend/):

  ```bash
  pnpm install
  ```
* pnpm, game-engine paketini yine localden otomatik olarak bağlayacaktır.

---

> Her iki yöntemde de workspace paketleri local geliştirmede anında entegre edilir. Peer dependency varsa ana projenin package.json’ına da eklemeyi unutmayın!


## 4. Workspace’te peerDependencies Kullanımı

### Peer Dependency Tanımı

* Örneğin game-engine’da:

```json
{
  ...
  "peerDependencies": {
    "pixi.js": "^8.8.1",
    "gsap": "^3.12.7"
  }
}
```

* Bu, engine’ın çalışabilmesi için dışarıdan (ör. oyun projesinden) ilgili paketin yüklenmesi gerektiğini belirtir.

### Tüketici (oyun) tarafından eklenmesi:

```json
{
  "dependencies": {
    "game-engine": "workspace:*",
    "pixi.js": "^8.8.1"
  }
}
```

* Aynı sürüm eklenirse sadece bir kopya yüklenir.
* Farklı sürüm eklenirse pnpm uyarı veya hata verebilir.

### Peer ve devDependency birlikte kullanımı

* Engine’da peer dependency ayrıca devDependency olarak eklenebilir. Böylece engine kendi başına geliştirilip test edilebilir.

---

## 5. YAML ve Workspace Dosyalarının Önemi

* `pnpm-workspace.yaml` workspace’in can damarıdır. Yanlış, eksik veya yanlış isimde olursa monorepo fonksiyonları çalışmaz.
* Her zaman proje kökünde ve doğru yazımda olmalı:

  ```yaml
  packages:
    - "game-engine"
    - "game-types/*"
    - "games/*"
  ```
* Alt paketlerin dizin isimleri ve pattern’leri dosya ile birebir eşleşmeli.

---

## 6. Sık Sorulanlar & Troubleshooting

* **Bir bağımlılığı el ile sildim:**

  * `pnpm install` çalıştır, otomatik temizler.
* **Birden fazla pakette sürüm çakışması:**

  * Aynı bağımlılıklar için aynı sürümü kullanmaya dikkat et.
* **pnpm-workspace.yaml eksik veya hatalı:**

  * Workspace fonksiyonu çalışmaz, kontrol et.
* **Peer dependency eksikse:**

  * Proje başlarken uyarı veya hata verir, eksik paketi ekle.
* **node\_modules bozuldu, aşırı büyüdü:**

  * Tam temizlik için: `rm -rf node_modules pnpm-lock.yaml && pnpm install`

---

## 7. Özet Akış (TL;DR)

```bash
# 1. Klonla 
# 2. Corepack ve pnpm’i aktif et
# 3. Kökte pnpm install ile tüm bağımlılıkları kur
# 4. Çalıştırmak istediğin pakete gir, pnpm dev | pnpm run dev | npm run dev, şeklinde çalışacaktır.
# 5. Eğer kökte pnpm dev | pnpm run dev | npm run dev, bu işlemi yapar isen tüm projeler ayağa kalcakatır. (Burası ekstra organize edilecektir.)
# 6. Paket ekle/sil, gerekirse pnpm install ile node_modules’u güncelle
```

---

> Detaylı sorularda, bu rehbere bakabilir veya sorularınız için @edleron'a yazabilirsiniz..
