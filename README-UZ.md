# Zamon — to‘liq yangi kod

Bu loyiha Next.js, Firebase umumiy bazasi va Netlify bilan ishlaydi. Eski papkangizni zaxiralang; saytga avtomatik deploy qilinmadi.

Eski saytdagi brauzerga saqlangan profillar yangi bazaga avtomatik ko‘chmaydi. Ular o‘chirilmaydi, lekin yangi hisobda ko‘rinmaydi. O‘qituvchi o‘quvchining boshlang‘ich kitob va Unitini belgilashi mumkin.

## 1. Kodni ochish

Kod ZIP’ini ochib, essential-mastery papkasini VS Code’da oching. Git Bash terminalida:

~~~bash
pnpm install
cp .env.example .env.local
~~~

Ignored builds xatosi chiqsa pnpm approve-builds, keyin pnpm install bajaring. pnpm-workspace.yaml kerakli build ruxsatlarini belgilaydi.

## 2. Firebase ulash — majburiy

Loyiha: zamon-c4a03. Web config server ma’lumotlariga kirish uchun yetarli emas. Bu sayt ism-familiya/parol va HttpOnly server sessiyasini ishlatadi; Firebase Authentication yoki email login talab qilinmaydi.

1. Firebase Console → zamon-c4a03 → Build → Firestore Database → Create database. Standard edition va production mode tanlang. Mavjud baza bo‘lsa yangisini yaratmang.
2. Firestore → Rules: yangi, faqat shu saytga tegishli bazada database/firestore.rules faylini qo‘ying va Publish. Agar loyihada boshqa ilovalar bo‘lsa mavjud qoidalarning umumiy ruxsatlari school_* kolleksiyalarini ochib qo‘ymasligini tekshiring; eski qoidalarni ko‘r-ko‘rona almashtirmang. Bu paketdagi qoidalar barcha to‘g‘ridan-to‘g‘ri brauzer kirishini yopadi.
3. Project settings → Service accounts → Generate new private key. Yuklangan JSON’ni loyiha papkasiga firebase-service-account.json nomida joylashtiring. Uni chatga yoki GitHubga yubormang.
4. .env.local ichida FIREBASE_SERVICE_ACCOUNT_FILE=./firebase-service-account.json bo‘lsin. FIREBASE_PROJECT_ID va FIREBASE_STORAGE_BUCKET tayyor kiritilgan. GEMINI_API_KEY ni o‘zingiz kiriting.
5. Server service account’da Firestore o‘qish/yozish uchun IAM ruxsati bo‘lishi kerak. Console yaratgan Admin hisob odatda kerakli ruxsatlar bilan keladi; permission denied bo‘lsa Cloud IAM’da shu client_email hisobining ruxsatlarini tekshiring.

School kolleksiyalari setup:accounts va sayt ishlaganda avtomatik yaratiladi. SQL bajarilmaydi. Mavjud boshqa Firebase ma’lumotlari ko‘chirilmaydi va o‘zgartirilmaydi; sayt school_* kolleksiyalaridan foydalanadi.

Firebase server private key va Gemini kalitini NEXT_PUBLIC o‘zgaruvchisiga qo‘ymang. Key fayli va .env.local .gitignore bilan chiqarilgan.

## 3. O‘qituvchi, Administrator va vaqtincha Admin

`.env.local`ga o‘zingiz tanlagan, bir-biridan farqli va kamida 12 belgili ikkita maxfiy kodni qo‘shing:

~~~env
TEACHER_ACCESS_CODE=ozingiz_tanlagan_maxfiy_oqituvchi_kodi
ADMINISTRATOR_ACCESS_CODE=ozingiz_tanlagan_boshqa_maxfiy_kod
~~~

Misoldagi matnlarni haqiqiy kodingizga almashtiring. Teacher tanlang → Kodni kiriting → to‘g‘ri koddan keyin ism, familiya va parol qo‘ying. Xato kodda “Siz o‘qituvchi emassiz” chiqadi. Kod serverda tekshiriladi; tasdiqlash 10 daqiqa amal qiladi. O‘qituvchi kodi Hamidulloh bilangina cheklanmaydi. Administrator kodi bitta Administrator hisobini yaratadi; bu hisob o‘qituvchilarni bloklaydi/ochadi, parollarini yangilaydi va o‘quvchi to‘lovlarini belgilaydi. Har xil ism bilan bir vaqtning o‘zida ikkita Administrator yaratish ham serverda atomik tarzda rad etiladi.

Mavjud vaqtincha Adminni Administrator qilish uchun Administrator kodidan keyin o‘sha Adminning ism-familiyasi va mavjud parolini kiriting. Mavjud o‘quvchi yoki o‘qituvchi hisobini bu yo‘l bilan almashtirib bo‘lmaydi. Administrator allaqachon yaratilgan bo‘lsa, mavjud hisob bilan Sign in qiling.

Keyingi kirishlarda Already registered? Sign in → ism, familiya va parol. Maxfiy kodni qayta kiritish talab qilinmaydi. O‘qituvchi kodini faqat o‘qituvchilarga, Administrator kodini faqat Administratorga bering; frontendga yoki GitHubga yozmang. Kodni almashtirish mavjud hisoblarni o‘chirmaydi.

Siz allaqachon vaqtincha Admin yaratgan bo‘lsangiz `pnpm setup:accounts`ni qayta bajarish kerak emas. Yangi loyiha uchun bu skript vaqtincha Admin yaratishni qo‘llaydi. Eski Hamidulloh taklif kodi bilan yaratilgan faol hisob/parol saqlanadi. Yangi kirish oynasi umumiy kodni ishlatadi.

Oddiy Admin va Administrator alohida rollar. Oddiy Admin Settings → Leave admin role bilan o‘quvchiga qaytadi. Oddiy Admin berish/olish va keyingi Unitni tasdiqlash faqat o‘qituvchiga tegishli. Hozir o‘qituvchilar bir maktabning umumiy guruh va o‘quvchilar bazasi bilan ishlaydi.

### Mavjud hisobga vaqtincha Administrator berish

Loyihangizda server service account allaqachon ulangan bo‘lsa:

~~~bash
pnpm setup:administrator
~~~

Mavjud hisobingizning ism va familiyasini kiriting. Yangi hisob ochilmaydi, parol, guruh, kitob, Unit, natijalar va to‘lov sanasi saqlanadi. Kod kiritish talab qilinmaydi; ushbu terminal buyrug‘i server service account ruxsatidan foydalanadi. Hisob oddiy Admin yoki o‘quvchi bo‘lishi kerak. Boshqa Administrator mavjud bo‘lsa uning huquqini o‘zgartirmaydi va yangi Administrator bermaydi.

Saytda mavjud parol bilan kiring (Already registered? Sign in). Settings → Leave Administrator role tasdiqlansa o‘quvchiga qaytasiz. Vaqtinchalik huquq va Administrator bandligi bitta atomik operatsiyada olinadi; keyin alohida kod bilan doimiy Administrator yaratilishi mumkin. Doimiy Administrator hisobida bu chiqish tugmasi bo‘lmaydi. Buyruqni qayta bajarish faol vaqtincha Administratorning ma’lumotlarini o‘zgartirmaydi.

### Oylik to‘lov

Administrator → Payments → familiya bo‘yicha qidirish. Ism va guruh ham ko‘rsatiladi. Bu jonli dars to‘lovlarini qayd qiladi, saytning o‘zi pul olmaydi.

Yangi va mavjud o‘quvchilarga boshida To‘langan holati beriladi. Mavjud hisobning boshlang‘ich sanasi bu yangilanishda birinchi ko‘rilgan kunida saqlanadi; qayta kirish muddatni qayta boshlamaydi. To‘lov sanalari Asia/Tashkent bo‘yicha.

Bugun to‘langan deb belgilash → shu sanadan bir kalendar oy amal qiladi. Masalan, 3-sentabr → 3-oktabrda To‘lanmagan. Sana keyingi oyda bo‘lmasa oyning oxirgi kuni olinadi (31-yanvar → 28/29-fevral). To‘lanmagan kundan 7 kun ogohlantirish, keyin dars/audio/AI API ishlashi bloklanadi. Sana tekshiruvi har bir server so‘rovida bajariladi; scheduler bo‘lmasa ham ishlaydi. Administrator To‘langan deb belgilashi bilan ochiladi, natijalar saqlanadi. Qo‘lda To‘lanmagan qilish 7 kunlik muddatni bugundan boshlaydi; qayta To‘lanmagan bosish avvalgi muddatni uzaytirmaydi. To‘lov tarixi `school_payments` kolleksiyasiga yoziladi.

## 4. Barcha audiolar — shu ZIP ichida

media/audio papkasida 1362 MP3 bor. Firebase Console → Storage → Get started. Firebase Storage uchun Blaze billing plan talab qilinadi (rasmiy ma’lumot: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024). Bu kod avtomatik pullik tarifni yoqmaydi.

Yangi, faqat shu saytga tegishli bucket’da database/storage.rules qoidalarini Storage → Rules’ga qo‘ying va Publish. Boshqa ilova bilan bir bucket ishlatilsa eski qoidalarni almashtirishdan oldin mavjud fayl ruxsatlarini tekshiring. Audio/ ostidagi school audiolari ommaga ochiq bo‘lmasin.

Server service account’da Storage object o‘qish/yozish IAM ruxsati kerak. Keyin:

~~~bash
pnpm upload:audio
~~~

Audio audio/a1/coursebook va boshqa papkalarga yuklanadi, jami taxminan 457 MiB. Uzilish bo‘lsa qayta bajaring. media/ GitHubga yuborilmaydi. Server o‘quvchining kitob/Unit ruxsatini tekshirib, bir soatlik signed URL beradi. Essential listening brauzer ovozi bilan ishlaydi.

## 5. Ishga tushirish

~~~bash
pnpm dev
~~~

http://localhost:3000 oching. Birinchi kirish inglizcha, Settings’da o‘zbekcha tanlanadi.

~~~bash
pnpm typecheck
pnpm build
~~~

O‘quvchi faqat birinchi ro‘yxatdan o‘tishda joriy kitob, Unit va dars qismini (Essential’da so‘zni) tanlaydi. Davom etish tugmasi aynan shu joydan yoki keyingi tugallanmagan darsdan boshlaydi. Oldingi qismlar avval o‘rganilgan deb ochiq turadi; ularga sun’iy baho yoki javob yozilmaydi. Shu Unit va oldingilari ochiq, keyingilari yopiq. O‘qituvchi boshlang‘ich darajani tekshirib tuzatishi mumkin.

Essential’da 3 so‘z ochiq. Bir so‘zning hamma mashqi to‘g‘ri tugatilsa, yana bittasi ochiladi. Takror bajarish qo‘shimcha so‘z ochmaydi. Unit testi oldingi Unitlarni ham takrorlaydi. Keyingi Unitni test avtomatik ochmaydi — o‘qituvchi tasdiqlaydi.

Navigate’da 70 Unit va 280 dars qismi mavjud. Har bir qismda 12 ta mashq (3 listening, 3 speaking, 2 gapni to‘ldirish, 2 so‘zlarni tartiblash, 1 tanlov va 1 erkin yozma ish), Unitda 48 ta mashq va alohida test bor. 420 ta yangi mavzuli model gap qo‘shildi; bir qismdagi listening va speaking gaplari alohida tanlanadi. Dastlab .1 qismi ochiq; uni tugatgach .2, keyin .3 va .4 ochiladi. Unit testi hamma qismlar tugagach ochiladi. Mavzu va grammar yuborilgan Coursebook mundarijalariga moslangan, mashqlar mustaqil tuzilgan. Bu kitobdagi barcha topshiriqlarning to‘liq raqamli nusxasi emas. Yozma ishlar o‘qituvchi tekshirishi uchun saqlanadi; Gemini fikri o‘qituvchi bahosini almashtirmaydi.

Listening va Videos bo‘limlarida Essential ko‘rsatilmaydi; uning tinglash mashqlari so‘z darslarida qoladi.

Listening: Kitob → Coursebook / Workbook → Unit → Track → alohida player. Play/Pause, Stop, 10 soniya orqaga/oldinga, vaqt slayderi, tezlik va MP3 yuklab olish mavjud.

Mahalliy pnpm dev’da paket ichidagi media/audio fayllari login va Unit ruxsati tekshirilgan /api/audio orqali eshittiriladi, Range so‘rovlari qo‘llanadi. Hali Firebase Storage’ga yuklamasdan ham lokal kompyuterda ishlaydi. Netlify production’da mahalliy fallback yo‘q: pnpm upload:audio bilan Storage’ga yuklash kerak. Audio download funksiyasi MP3’ni saqlaydi.
Videos: Kitob → Unit → Video. 70 ta video havolasi mavjud. Ichki YouTube player ishlamasa Open on YouTube tugmasi bor. Shu muhitda ularning barchasining playback/embedding ruxsati tasdiqlanmadi. Videoda savol-javob yo‘q. YouTube havolasi orqali MP4 yuklab olish qo‘shilmadi; bunday tugma uchun alohida MP4 fayllari kerak.

## 6. Guruhlar, uyga vazifa va baholar

Groups bo‘limida guruh nomi, dars kunlari, dars vaqti va eslatma vaqtini belgilang. Barcha vaqtlar Asia/Tashkent bo‘yicha.

Students → New students orqali yangi o‘quvchilarni guruhga qo‘shing. O‘qituvchi kitob/Unitni belgilaydi yoki Approve next Unit tugmasini bosadi. O‘qituvchi o‘z pedagogik qarori bilan ruxsat beradi; test uni avtomatik cheklamaydi.

Vazifa yoki event qo‘shishda kerakli guruhlar alohida tanlanadi, hech bir guruh avtomatik tanlanmaydi. Qo‘shimcha vazifada pop-up belgisi bor. O‘quvchi I have read this bosgunga qadar u o‘qilmagan hisoblanadi. Deadline yo‘q; vazifa o‘qituvchi olib tashlaguncha ko‘rinadi.

Students’da mashq javoblari, xatolar, natija, sarflangan vaqt, baho va izoh ko‘rinadi. O‘quvchi faqat o‘z natijalarini ko‘radi. Javoblar oynasida oxirgi 1000 urinish ko‘rsatiladi; tugallangan darslar va umumiy sarflangan vaqt bazada alohida saqlanadi, eski urinishlar ko‘rinmay qolsa ham darslar qayta yopilmaydi. Speaking taxminiy transkript orqali baholanadi, fonema yoki aksent o‘lchanmaydi. Mikrofon audio yozuvi serverga saqlanmaydi.

## 7. Bildirishnomalar va o‘rnatish

~~~bash
pnpm setup:push
~~~

VAPID_PRIVATE_KEY — serverning push bildirishnomalarni sayt nomidan tasdiqlab yuborish uchun maxfiy kaliti. NEXT_PUBLIC_VAPID_PUBLIC_KEY — brauzer obunasiga beriladigan ochiq kalit. Bu juftlikni faqat hali kalitlaringiz bo‘lmasa yarating; mavjud juftlikni saqlang.

pnpm setup:push mavjud kalitlarni saqlaydi; hali juftlik bo‘lmasa yaratib .env.localga yozadi. .env.local ichidagi NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT qiymatlarini Netlify environment variables’ga ko‘chiring. VAPID_SUBJECT haqiqiy https://sizning-saytingiz.netlify.app manzili bo‘lsin. Private key sir saqlanadi. Kalit almashsa foydalanuvchilar ruxsatni qayta ulashi kerak.

Yuqori o‘ngda sozlamalar yonidagi qo‘ng‘iroq belgisi baho/izoh, guruhga berilgan vazifa, event va kunlik dars eslatmalarini ko‘rsatadi. O‘qilmaganlar soni belgida ko‘rinadi. Baho va vazifa xabarlari serverda darhol yoziladi; brauzer ochiq bo‘lsa har 60 soniyada yoki oynaga qaytganda yangilanadi. Kunlik eslatma lokal ishlashda ham saytga kirilganda bir marta inboxga yoziladi. Fon push uchun VAPID va foydalanuvchi ruxsati kerak.

Netlify daily-reminders funksiyasini har 15 daqiqada bajaradi. Belgilangan guruh eslatma vaqtidan keyin kuniga bir marta bugungi dars, uyga vazifa yoki event haqida xabar yuboradi. Yetkazilish vaqti taxminan 15 daqiqalik oraliqda, qurilma/internetga bog‘liq. Mahalliy pnpm dev’da jadval avtomatik yurmaydi.

Settings → Enable notifications. Brauzer ruxsati, HTTPS, Firebase, VAPID va Netlify scheduled function tayyor bo‘lishi kerak. Ular ulanmaguncha fon bildirishnomalari ishlamaydi.

Android/Chrome’da Install app taklifi yoki brauzer menyusi orqali o‘rnating. iPhone’da Safari → Share → Add to Home Screen. O‘rnatish offline darslar borligini anglatmaydi.

Speaking mikrofon ruxsatini so‘raganda Allow bosing. Avval bloklangan bo‘lsa brauzer manzil satri → Site permissions → Microphone → Allow. Chrome/Edge ovozni tanishi internet va brauzerga bog‘liq. Speakingda matn terish maydoni yo‘q. Chrome/Edge kabi ovozni tanishni qo‘llaydigan brauzer va mikrofon kerak; writing mashqlari alohida. Transkript avtomatik tanilgan nutq bo‘lib, audio yozuv saqlanmaydi.

## 8. GitHub va Netlify

Eski repozitoriy papkasidagi kodni shu kod bilan almashtiring, .git papkasini saqlang. .env.local va media papkasi GitHubga yuborilmaydi.

~~~bash
git status
git add .
git commit -m "Add Navigate books and teacher-managed learning"
git push origin main
~~~

Netlify → Environment variables:

- FIREBASE_PROJECT_ID=zamon-c4a03
- FIREBASE_STORAGE_BUCKET=zamon-c4a03.firebasestorage.app
- FIREBASE_SERVICE_ACCOUNT_JSON: firebase-service-account.json ichidagi butun JSON matni. Bu faqat server env qiymati; frontend kod yoki repository fayli emas.
- TEACHER_ACCESS_CODE va ADMINISTRATOR_ACCESS_CODE: .env.local bilan bir xil maxfiy kodlar.
- GEMINI_API_KEY, GEMINI_MODEL va push uchun VAPID o‘zgaruvchilari.

Netlify’da FIREBASE_SERVICE_ACCOUNT_FILE kerak emas; server JSON environment qiymatini ishlatadi. Build command pnpm build, publish directory .next. netlify.toml paketda bor. Key yoki .env.local faylini Netlify repositoryga yuklamang.

Bir xil Firebase loyihasi ishlatilsa hisoblar va natijalar Netlify sayt/profil o‘zgarganda ham shu bazada saqlanadi. Eski brauzer/Supabase profillarini bu paket avtomatik migratsiya qilmaydi.

## Tekshiruv va cheklovlar

TypeScript va Next.js production build o‘tdi. Mahalliy mock sinovda OAuth imzosi/token keshi, CRUD, takror ismning rad etilishi, progress upsert, statistika, login limiti, parallel kunlik notification claim va audio URL imzosi tekshirildi.

Firebase adapterida kolleksiya CRUD, atomik login limitlari, qayta topshirishda progress upsert va kunlik notification claim ishlatiladi. Huquqlar Next.js serverida tekshiriladi; brauzer Firestore va Storage bazasiga bevosita kira olmaydi. Web configdagi API key bu server kalitining o‘rnini bosmaydi.

Bu yangilanishda haqiqiy Firebase loyihasiga, telefon pushiga yoki mikrofoniga ulanib tekshirilmagan: server private key foydalanuvchining kompyuterida kiritiladi. Real audio upload, Gemini va push tekshiruvlari sozlangandan keyin bajariladi. Telefon ko‘rinishlari va barcha YouTube embedding ruxsatlari avtomatik tasdiqlanmagan. Navigate mashqlari mavzuga mos original mashqlar; barcha textbook mashqlarining nusxasi emas.

Firestore adapteri avval bitta tenglik filtri bilan oladi, qolgan filtrlash/sortni serverda bajaradi. O‘qituvchi statistikasi barcha attemptlarni o‘qiydi; katta sinflarda foydalanish va read xarajatlarini kuzating. Login limitlari 15 daqiqada 15 urinish. Eski session/notification hujjatlari avtomatik o‘chirilmaydi; Firestore TTL/arxiv siyosati keyingi boshqaruv ishidir.

Yangi sinovlar: noto‘g‘ri/to‘g‘ri kod, cookie imzosini o‘zgartirish, ikki rol kodi, kodsiz hisob yaratishni rad etish, yagona Administratorning atomik yaratilishi, mavjud parollar himoyasi, Toshkent yarim tuni, 7 kunlik blok, oy oxiri/kabisa, to‘lov/rol ruxsatlari, inbox maxfiyligi va 3360 Navigate mashqining tarkibi.


ESSENTIAL 2–6 MISOLLARI
Har so‘zning 5 ta yangi misoli birinchi ochilganda serverdagi GEMINI_API_KEY orqali yaratiladi: 2 ta 4–9 so‘zli listening, 3 ta 10–20 so‘zli speaking/writing. Boshqa so‘zlar va grammatika Beginner uchun sodda bo‘lishi so‘raladi. Beshta gap takrorlanmasligi, target so‘z mavjudligi va uzunligi tekshiriladi. Natija school_lesson_content ichida bir marta saqlanadi. Kalit yoki kvota ishlamasa mavjud dars saqlanadi, yozuv orqali xabar beriladi.
Dars mashqlari school_word_sessions ichida o‘quvchiga bog‘langan nusxada saqlanadi. Yangi misollar keyinchalik paydo bo‘lsa ham yarim tugagan darsning savollari o‘zgarmaydi. Nusxa 7 kun amal qiladi. Progress va oldingi foydalanuvchi identifikatorlari o‘zgartirilmagan. Markaz ko‘chirilganda ushbu dars nusxalari ham ko‘chadi.
Mahalliy sinov: pnpm dev → Essential Book 2 → Unit 1 → anxious. Birinchi tayyorlashdan keyin 9 ta mashq chiqishini, ikki listening va uch boshqa speaking/writing gapini, chiqib qayta kirganda oxirgi joy saqlanishini tekshiring. Haqiqiy Gemini, Firebase va telefon push xabarlari shu muhitda tekshiriladi.


NAVIGATE + ESSENTIAL BIR VAQTDA
Ro‘yxatdan o‘tishda ikkita alohida tanlov bor: Navigate asosiy kitobi va uning UNIT/darsi; Essential qo‘shimcha kitobi va uning UNITi. Essentialda so‘z tanlash maydoni yo‘q, yangi UNIT birinchi so‘zidan boshlanadi va dastlab 3 ta so‘z ochiq turadi. Ikki yo‘nalish bir-birini tugatishni kutmaydi.
Profilning book_tracks maydonida har bir yo‘nalishning kitobi, ochilgan UNITi va boshlash nuqtasi saqlanadi. Eski profillar uchun mavjud kitobning UNIT/progressi saqlanadi, yetishmagan yo‘nalish Beginner/Essential 1 UNIT 1dan boshlanadi. O‘qituvchi Students → profil → Edit access & group orqali ikkalasining boshlash joyini alohida o‘zgartiradi. Profil ostida Navigate va Essential uchun alohida Approve next Unit tugmalari bor. Faqat guruhni o‘zgartirish boshlash nuqtalarini yangilamaydi.

## Umumiy kodlar va Owner kirishi

Teacher, Administrator va Owner kodlari barcha markazlar uchun umumiy. Owner bir vaqtda 3 ta faol brauzer/qurilmada kirishi mumkin; to‘rtinchi qurilma kira olmaydi. Avval boshqa qurilmada hisobdan chiqish kerak. Bir brauzerdan qayta kirish eski sessiyani almashtiradi. Ownerda chiqish tugmasi faqat Settings / Sozlamalarda turadi. Sign out / Hisobdan chiqish shu brauzerdagi sessiyani yopib, Log in / Kirish oynasini ochadi. Boshqa brauzer yoki profil alohida qurilma hisoblanadi.

## Aniq UNIT tanlash

Teacher, Administrator, Admin va Owner: Students → o‘quvchi profili → Navigate · Choose Unit yoki Essential · Choose Unit. Registerdagi kabi kitob va UNITni tanlab Save bosing. Navigate darsi ham tanlanadi. Faqat tanlangan yo‘nalish yangilanadi; boshqa yo‘nalish, guruh va mavjud natijalar saqlanadi. Hisobni o‘chirish va qayta register qilish shart emas.

## Oldingi kitoblar va takrorlash

Masalan, Navigate Elementary UNIT 4 tanlangan bo‘lsa Beginner barcha UNITlari bilan, Elementary 1–4 UNITlari bilan ochiq. Keyingi kitob va UNITlar yopiq. Essential ham o‘z kitoblar ketma-ketligida shu qoida bilan ishlaydi. Oldingi kitob va UNITlarda dars/so‘z/testni erkin takrorlash mumkin. Joriy UNITda odatdagi bosqichma-bosqich o‘rganish saqlanadi. Ochilgan kitob avtomatik tugallangan deb belgilanmaydi.


## 2026-10-04 yangilash

Yangi rollar, Owner hisob tanlovi, ovozlar, takliflar va mobil Back sozlamalari uchun UPDATE-UZ.txt ni o'qing. Bu faylda yangi ADVERTISER_ACCESS_CODE va ixtiyoriy 6-ovoz sozlamalari berilgan. Eski .env.local va Firebase ma'lumotlarini almashtirmang.
