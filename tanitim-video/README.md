# Seyir tanıtım videosu

[Remotion](https://www.remotion.dev) ile kodla yazılmış, ~26 saniyelik tanıtım videosu
(1920×1080, 30 kare/sn). Görseller uydurma örnek veriyle çekilmiş ekran görüntüleridir.

Sahneler (`src/sahneler/`): Açılış → Sorun → Özet → Görev panosu → Tutanak → Arama → Kapanış.
Ortak renkler, yazı tipi ve kareye bağlı canlı logo `src/ortak.tsx` içinde.

```bash
cd tanitim-video
npm i
npm run dev                                   # Studio'da önizleme
npx remotion render SeyirTanitim out/seyir-tanitim.mp4 --codec=h264 --crf=20
```

Render için Remotion kendi tarayıcısını indirir; bilgisayarda Chrome varsa
`--browser-executable="C:/Program Files/Google/Chrome/Application/chrome.exe"` ile o kullanılabilir.
Çıktı `out/` klasörüne yazılır ve depoya girmez.

Müzik: `node araclar/muzik-uret.cjs` ile kodla üretilir (public/muzik.wav); kimsenin eserinden parça içermez, telif sorunu yoktur.

Lisans notu: Remotion, 3 kişiye kadar ekipler için ücretsizdir.
