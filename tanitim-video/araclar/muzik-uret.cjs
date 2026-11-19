// Videonun fon müziğini sıfırdan üretir: public/muzik.wav
// Neden? İndirilen "telifsiz" müziklerin lisansı çoğu zaman belirsizdir. Bu parça tamamen
// kodla, ses dalgası hesaplanarak yapılır; kimsenin eserinden parça içermez, telif sorunu yoktur.
//
// Yapı: 100 BPM, Am – F – C – G döngüsü (her akor bir ölçü).
//   0. ölçü : yumuşak pad (akor)                 → logo açılışı
//   1. ölçü : + bas                              → sorular
//   2. ölçü : + arpej (akor notalarının sırayla çalınması)
//   3. ölçü : + hafif davul (kick) ve hi-hat     → özellik sahneleri
//   son 2,5 sn: davul susar, her şey yavaşça kısılır (kapanış)
// Kullanım: node araclar/muzik-uret.cjs
const fs = require("fs");
const path = require("path");

const ORNEKLEME = 44100;
const SURE = 26.4; // saniye (video 790 kare / 30 = 26,33 sn)
const BPM = 100;
const VURUS = 60 / BPM; // bir vuruş (sn)
const OLCU = VURUS * 4;
const N = Math.floor(SURE * ORNEKLEME);

// Nota adı yerine MIDI numarası: 69 = La (A4, 440 Hz)
const frekans = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const AKORLAR = [
  [57, 60, 64], // Am: La Do Mi
  [53, 57, 60], // F : Fa La Do
  [48, 52, 55, 60], // C : Do Mi Sol Do
  [55, 59, 62], // G : Sol Si Re
];

const sol = new Float32Array(N), sag = new Float32Array(N);
const ekle = (i, deger, pan = 0) => { // pan: -1 sol, +1 sağ
  if (i < 0 || i >= N) return;
  sol[i] += deger * (1 - Math.max(0, pan));
  sag[i] += deger * (1 + Math.min(0, pan));
};

// Basit kararlı rastgele sayı (her üretimde aynı sonuç)
let tohum = 7;
const rastgele = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647) * 2 - 1;

const olcuSayisi = Math.ceil(SURE / OLCU);
for (let o = 0; o < olcuSayisi; o++) {
  const akor = AKORLAR[o % 4];
  const bas = o * OLCU;

  // PAD: birkaç harmonikli, hafif akortsuz (detune) sesler; yavaş giriş ve çıkış
  for (const [k, nota] of akor.entries()) {
    for (const sapma of [-0.12, 0.12]) {
      const f = frekans(nota + sapma / 1);
      const bitisOrnek = Math.floor((bas + OLCU + 0.4) * ORNEKLEME);
      for (let i = Math.floor(bas * ORNEKLEME); i < bitisOrnek && i < N; i++) {
        const t = i / ORNEKLEME - bas;
        const zarf = Math.min(1, t / 0.5) * Math.min(1, (OLCU + 0.4 - t) / 0.6);
        const faz = 2 * Math.PI * f * (i / ORNEKLEME);
        const ses = Math.sin(faz) + 0.35 * Math.sin(2 * faz) + 0.12 * Math.sin(3 * faz);
        ekle(i, ses * zarf * 0.028, sapma < 0 ? -0.4 + k * 0.1 : 0.4 - k * 0.1);
      }
    }
  }

  // BAS: akorun kökü, iki oktav aşağıda; her vuruşta yumuşak vurgu
  if (o >= 1) {
    const f = frekans(akor[0] - 12);
    for (let v = 0; v < 4; v++) {
      const b = bas + v * VURUS;
      for (let i = Math.floor(b * ORNEKLEME); i < (b + VURUS) * ORNEKLEME && i < N; i++) {
        const t = i / ORNEKLEME - b;
        const zarf = Math.min(1, t / 0.01) * Math.exp(-t * 3.2);
        ekle(i, Math.sin(2 * Math.PI * f * (i / ORNEKLEME)) * zarf * 0.16);
      }
    }
  }

  // ARPEJ: sekizlik notalarla akor notaları bir oktav yukarıda, sağ-sol gezinerek
  if (o >= 2) {
    const sira = [0, 1, 2, 1, 2, 3 % akor.length, 2, 1];
    for (let s = 0; s < 8; s++) {
      const nota = akor[sira[s] % akor.length] + 12;
      const f = frekans(nota);
      const b = bas + s * (VURUS / 2);
      for (let i = Math.floor(b * ORNEKLEME); i < (b + 0.9) * ORNEKLEME && i < N; i++) {
        const t = i / ORNEKLEME - b;
        const zarf = Math.min(1, t / 0.004) * Math.exp(-t * 6);
        const faz = 2 * Math.PI * f * (i / ORNEKLEME);
        ekle(i, (Math.sin(faz) + 0.2 * Math.sin(3 * faz)) * zarf * 0.07, s % 2 ? 0.35 : -0.35);
      }
    }
  }

  // DAVUL: her vuruşta yumuşak kick, aralarında kısa hi-hat (son 2,5 sn hariç)
  if (o >= 3) {
    for (let v = 0; v < 4; v++) {
      const b = bas + v * VURUS;
      if (b > SURE - 2.5) break;
      for (let i = Math.floor(b * ORNEKLEME); i < (b + 0.35) * ORNEKLEME && i < N; i++) {
        const t = i / ORNEKLEME - b;
        const f = 50 + 70 * Math.exp(-t * 30); // perdesi hızla düşen sinüs
        ekle(i, Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * 0.32);
      }
      const h = b + VURUS / 2;
      for (let i = Math.floor(h * ORNEKLEME); i < (h + 0.06) * ORNEKLEME && i < N; i++) {
        const t = i / ORNEKLEME - h;
        ekle(i, rastgele() * Math.exp(-t * 70) * 0.05, 0.2);
      }
    }
  }
}

// YANKI: iki kanalda farklı gecikmeli geri besleme (alan hissi)
const yanki = (kanal, gecikmeSn, geri) => {
  const g = Math.floor(gecikmeSn * ORNEKLEME);
  for (let i = g; i < N; i++) kanal[i] += kanal[i - g] * geri;
};
yanki(sol, 0.36, 0.28);
yanki(sag, 0.42, 0.28);

// Genel ses: başta 0,4 sn açılma, sonda 2,5 sn kısılma; tepe değere göre normalleştirme
let tepe = 0;
for (let i = 0; i < N; i++) tepe = Math.max(tepe, Math.abs(sol[i]), Math.abs(sag[i]));
const kazanc = 0.85 / tepe;
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const t = i / ORNEKLEME;
  const genel = Math.min(1, t / 0.4) * Math.min(1, (SURE - t) / 2.5);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sol[i] * kazanc * genel)) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sag[i] * kazanc * genel)) * 32767), i * 4 + 2);
}

// WAV başlığı (16 bit, stereo)
const baslik = Buffer.alloc(44);
baslik.write("RIFF", 0); baslik.writeUInt32LE(36 + pcm.length, 4); baslik.write("WAVE", 8);
baslik.write("fmt ", 12); baslik.writeUInt32LE(16, 16); baslik.writeUInt16LE(1, 20); baslik.writeUInt16LE(2, 22);
baslik.writeUInt32LE(ORNEKLEME, 24); baslik.writeUInt32LE(ORNEKLEME * 4, 28); baslik.writeUInt16LE(4, 32); baslik.writeUInt16LE(16, 34);
baslik.write("data", 36); baslik.writeUInt32LE(pcm.length, 40);

const cikti = path.join(__dirname, "..", "public", "muzik.wav");
fs.writeFileSync(cikti, Buffer.concat([baslik, pcm]));
console.log("yazıldı:", cikti, (pcm.length / 1e6).toFixed(1) + " MB,", SURE + " sn");
