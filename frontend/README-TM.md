### Genel Bakış ve Açıklama

> Bu proje tüm igaming oyun projelerin (Slot, scratch, crash, mines, custom) uygulandığı monorepo şeklinde dizayn edilmiş üretim hattıdır.şu anda slot oyunları üzerine odaklanılmış ve geliştirilme süreci devam etmektedir. diğer oyun türleri ve süreçleri sonrasında dizayn edilip implemente edilecektir. Tüm süreç boyunca typescript programlama dilin kullanılacaktır. Ayrıca game library olarak pixi js, hareket süreçleri ve animasyonlar için gsap ve ses kütüphanesi yönetimi için pixi-sound library kullanılacaktır. Bazı dev dependencies ayarları için, vite, eslint gibi external kütüphaneler kullanılır

#### Klasör yapısı ve süreçleri

> Bu projede totalde, 4 adet klasör ve sistem desing yapısı bulunmaktadır. Bunlar :

- game-engine
- games
  - local-test-basic
  - local-test-v0
  - local-test-v1
- game-types
  - slot
  - scratch (sonrasında eklenecektir)

#### Monorepo ve sistemlerim haberleşmesi

> Bu projede kullanılan klasörler yada sistemler, workspace mantığında kurgulanmıştır. Bu sistemler pnpm süreçleri ile development'dan deployment'a kadar tüm süreci pnpm ile yönetilmektedir.

##### game-engine

> Kök sistemdeki ana sistemdir, bir oyunu initial eden, sistemi kurgulayan ve başlangıç noktarından bir tanesidir, içerisinde bir çok yapıyı barındırır. Bunlar :

- resize
- navigation
- i18n language
- audio
- gameobject builder
- storage
- utils

gibi yapıları barındır.

> Bu proje'de game dev, hiç bir şekilde buraya müdahale etmeden, gerekli contructors yapısını kurarak game süreçlerini başlatmalıdır. Bu projenin ortaya çıkması ve görevlerini tam olarak yerine getirilmesi bir oyun üretme sürecinin başarılı olması için aşağıdaki teknolojiler kullanılmaktadır.

- Dependencies
  - pixi js
  - @pixi/sound,
  - gsap
- Dev dependencies
  - gsap
  - @pixi/sound
  - pixi
  - typescript
  - eslint
  - vite

şeklinde package'ler kullanılır. game engine pixi js üzerine inşa edilmiştir, plugin'lerin extend edilip genişletilmesiyle bazı systemler ve componentler external hale getirilir. development ortamının ve deployment ortamının çalışması için vite'den yararlanılır. eslint gibi araçlar ilede harici entegrasyon ve kod bütünlüğü sağlanmaktadır. Tüm bu süreç typescript programlama diliyle icra edilmektedir.

##### game-types

kök sistemdeki slot projesi ana slot makinasını inşa eden süreçtir, (buraya ilerleyen zamanlarda scratch'te gelecektir. -> bu sebeple game-types klasörü oluşturulmuş ve alt klasör olarak slot ve scratch'ten bahsedilmiştir. bu sohbet boyunca slot tarafına odaklanılacaktır.) yine bir oyun geliştirici buraya hiç müdahale etmeeden, bir slot machine kurucu metodla başlatıp, reel sayısı, reel'lerin dönmesi ve bir slot makinasının tüm fonksiyonlarını burada kodlanarak icra edilir. Bu sistemin çalışması için aşağıdaki teknolojiler kullanılmaktadır. Bunlar :

- pixi
- pixi js
- x state
- @pixi/sound
- spine
- ve monorepo içerisinde bulunan game-engine

paketleridir.

development ortamın ve deployment ortamının ayağa kalması için, vite kullanlmaktadır. ayrıca, eslint ile kod bütünlüğü sağlanır. yine typescript programlama dili kullanılır.

##### games

Yine mimariyi tasarlayan ekibin, yapılan sistemleri test etmesi için, burada 3 farklı klasör bulunur, bunlar local-test-basic, local-test-v0, ve local-test-v1 şeklindedir. Amaç monorepo süresince yapılan sistemlerin uygulanma süreçleri sağlamaktır.

local-test-basic kısaca bahsedecek olur isek, kullanıla teknolojiler :

- pixi js
- pixi spine
- gsap
- slot-game-engine (game-types'dan gelir)
- game-engine

devdependencies olarak kullanılan teknojiler ise

- assetpack core
- eslint
- vite
- typescript,

yine bu local-test süreçlerince ve oyun'ların geliştirilme süreçleri boyunca, developer'lar typescript programlama dilini kullanacaktır. amacımızın bir game developer'ın engine ve slot yada diğer oyun türlerine dokunmadan yazdığımız sistemler ile oyunu kurgulayıp geliştirilmesini beklenmektedir.

#### Bazı Önemli Bilgiler

Monorepo sürecinde sistemlerin birbirleri ile haberleşmesi için, es modül şeklinde kullanım söz konusudur. her bir sistemin kendine özgü .d.ts dosyaları pixi ve diğer yapıları genişletir, vite ile bu süreçler organize edilip build ve dev ortamları inşa edilir, ve games klasörü altında kullanıma ve uygulanmasına hazır hale getirlir.

#### AI Rol Sistemi

> Senden istedğim, bir senior browser game developer gibi davranmanı, senior typescript uzmanı, aynı zamanda pixi js uzmanı gibi davranmanı istiyorum. Ekstra olarak senin mimari kurgulama ve sistem desing etme gibi üst seviye özelliklerinde olsun ve buna göre davran.

#### Sorun ve Geliştirilmesi Beklenen Özellik

> Oyunumuzun şu anda bir ui özelliği kurgulanmamıştır. Bu süreçte @pixi/ui kütüphanesi kullanılacaktır. proje kököne, pixi-ui klasörü oluşturulup, gerekli paketler dev ve devdependencies olarak eklenecektir. Bu süreçte, games altında bulunan test projeleri, game-engine initial ederken bir config ile kullanmak istediği ui bilgisin config ile haber verecek ve game-engine içerisinde gelen config karşılanıp ilgili pixi ui projesi initial edilecektir.
>
> ##### Sorunlar
>
> - ui objelerinin'de bir asset yani varlıklara ihtiyacı olucaktır. ama bunlar games altındaki projelerde organize edilip, assetpack'ten geçirlir ise, game developer'a ekstra iş yükü anlamına gelir. bu sebeple bu asset'ler pixi-ui/slot altında olmalı ve games altındaki projelerde deployment vede development ortamı ayağa kaltığında, burasıda problemsiz bir şekilde çalışmalıdır. Bunun nasıl en optimize, best practice olarak icra edileceği bana brifing şeklinde detaylı bir şekilde açıklanmalıdır
> - şu anda proje dosyaların incelediğini varsayaraktan, loadingscreen, mainscreen navigation'a haber verildiğinde sırasıyla işini yapıp süreci diğer scene'e bırakır. ama ui mainscreen ile birlikte initial edillmeli ve loading screen'den sonra ekranda gözükmelidir. ama benim demelerimde pixi ui'da bir scene gibi davranıp, bazı süreçlerde kendini kapatıp bir daha açmayabilir, yani container disable hale gelir. bu istenmeyen bir durumdur. bu süreçte navigation plugin'i detaylı olarak açıklanmlı, gerekirse ekstra kodlar yazılmalı, bana bu yönde birifing verilmelidir.
> - Es modul import, pixi genişletlmeleri (.d.ts), development ve deployment ortamınlarını vite ile doğru çalışması, workspace ayarları ve pnpm süreçlerini doğru bir şekilde bana aktarılmasını isityorum. burası detaylı bir şekilde bana açıklanmalıdır.

Eğer pixi-ui/slot güzel bir şekilde initial edilip, engine tarafına import edilebilir ise, diğer türlerde ona göre geliştirilecektir. Öncelik slot tarafıdır. sana gerekli tüm açıklamaları yaptığımı düşünüyorum. Bu süreci nasıl dizayn edeceğimi adım adım eksiksiz ve bu dökümana, sana verdiğim .zip uzantılı dosyaya göre yapmanı bekliyorum.

kolaylıkar dilerim
