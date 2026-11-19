// Videonun fon müziğini sıfırdan üretir: public/muzik.wav
// Neden? İndirilen "telifsiz" müziklerin lisansı çoğu zaman belirsizdir. Bu parça tamamen
// kodla, ses dalgası hesaplanarak yapılır; kimsenin eserinden parça içermez, telif sorunu yoktur.
//
// Tarz: enerjik, coşturan elektronik (128 BPM). Videonun sahnelerine göre zamanlandı:
//   0 – 6,8 sn  YÜKSELİŞ : pad'in filtresi açılır, trampet atışı hızlanır, yükselen ses (riser)
//   6,8 sn      PATLAMA  : özellik sahneleri başlar → çarpma sesi, tam enerji
//   6,8 – 21,8  ANA KISIM: dörtlük kick, el çırpma, pompalanan bas, geniş akorlar, hızlı melodi
//   21,8 sn →   KAPANIŞ  : büyük son akor, yavaşça söner
// Akorlar: C – G – Am – F (marş havası veren klasik dizi), yükselişte Am – F – G.
// Kullanım: node araclar/muzik-uret.cjs
const fs = require("fs");
const path = require("path");

const SR = 44100;
const SURE = 26.4; // video 790 kare / 30 = 26,33 sn
const BPM = 128;
const V = 60 / BPM; // vuruş
const OLCU = 4 * V;
const T0 = 205 / 30; // patlama anı: 3. sahnenin (Özet) başladığı kare
const TSON = T0 + 8 * OLCU; // son akor (kapanış sahnesiyle aynı anda)
const N = Math.floor(SURE * SR);

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const AKOR = {
  C: [60, 64, 67], G: [59, 62, 67], Am: [57, 60, 64], F: [57, 60, 65],
};
const ANA_DIZI = ["C", "G", "Am", "F"];
const akorAdi = (olcu) => {
  if (olcu >= 8) return "C";
  if (olcu >= 0) return ANA_DIZI[olcu % 4];
  return olcu <= -3 ? "Am" : olcu === -2 ? "F" : "G";
};
const olcuNo = (t) => Math.floor((t - T0) / OLCU);

const L = new Float32Array(N), R = new Float32Array(N);
const ekle = (i, d, pan = 0) => {
  if (i < 0 || i >= N) return;
  L[i] += d * (1 - Math.max(0, pan));
  R[i] += d * (1 + Math.min(0, pan));
};
let tohum = 11;
const gurultu = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647) * 2 - 1;
const yumusakAdim = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// Pompalama: patlamadan sonra her vuruşta ses kısılıp geri gelir (kick'e yer açar)
const pompa = (t) => {
  if (t < T0 || t >= TSON) return 1;
  const p = ((t - T0) % V) / V;
  return 0.3 + 0.7 * yumusakAdim(p / 0.55);
};

/* ---------- 1) Süpersaw akorlar (pad): her nota 5 hafif akortsuz testere dalgası ---------- */
{
  const SES = 5, SAPMA = [-0.18, -0.08, 0, 0.08, 0.18], PAN = [-0.8, -0.4, 0, 0.4, 0.8];
  const faz = Array.from({ length: 4 }, () => new Float64Array(SES).map(() => Math.random()));
  let lpL1 = 0, lpL2 = 0, lpR1 = 0, lpR2 = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const ad = akorAdi(olcuNo(t));
    const notalar = [...AKOR[ad], AKOR[ad][0] - 12];
    let sl = 0, sr = 0;
    for (let n = 0; n < notalar.length; n++) {
      for (let s = 0; s < SES; s++) {
        const f = hz(notalar[n] + SAPMA[s]);
        faz[n][s] = (faz[n][s] + f / SR) % 1;
        const d = 2 * faz[n][s] - 1;
        sl += d * (1 - Math.max(0, PAN[s]));
        sr += d * (1 + Math.min(0, PAN[s]));
      }
    }
    // Filtre: yükselişte 250 Hz'den 7 kHz'e açılır, sonra açık kalır
    const kesim = t < T0 ? 700 * Math.pow(7000 / 700, Math.pow(t / T0, 1.4)) : 7000;
    const a = 1 - Math.exp((-2 * Math.PI * kesim) / SR);
    lpL1 += a * (sl - lpL1); lpL2 += a * (lpL1 - lpL2);
    lpR1 += a * (sr - lpR1); lpR2 += a * (lpR1 - lpR2);
    let ses = t < T0 ? 1.4 - 0.4 * (t / T0) : t < TSON ? 0.75 : 0.95 * Math.exp(-(t - TSON) * 0.75);
    ses *= pompa(t) * 0.018;
    L[i] += lpL2 * ses; R[i] += lpR2 * ses;
  }
}

/* ---------- 2) Davullar ---------- */
const kick = (b, guc = 1) => {
  for (let i = Math.floor(b * SR); i < (b + 0.4) * SR && i < N; i++) {
    const t = i / SR - b;
    const f = 45 + 110 * Math.exp(-t * 28);
    const tik = t < 0.004 ? gurultu() * 0.3 : 0;
    ekle(i, (Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 7) + tik) * 0.55 * guc);
  }
};
const trampet = (b, guc = 1, uzun = 0.14) => {
  let lp = 0;
  for (let i = Math.floor(b * SR); i < (b + uzun * 2) * SR && i < N; i++) {
    const t = i / SR - b;
    const g = gurultu(); lp += 0.25 * (g - lp);
    const parlak = g - lp; // alçak frekansları atılmış gürültü
    const ton = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 30);
    ekle(i, (parlak * Math.exp(-t / uzun * 3) + ton * 0.5) * 0.22 * guc);
  }
};
const alkis = (b) => { for (const k of [0, 0.011, 0.022]) trampet(b + k, k ? 0.5 : 1, 0.12); };
const hihat = (b, guc = 1, acik = false) => {
  let lp = 0;
  const uz = acik ? 0.22 : 0.05;
  for (let i = Math.floor(b * SR); i < (b + uz) * SR && i < N; i++) {
    const t = i / SR - b;
    const g = gurultu(); lp += 0.6 * (g - lp);
    ekle(i, (g - lp) * Math.exp(-t / uz * 4) * 0.12 * guc, 0.25);
  }
};

// Yükseliş: ölçü -2'de kick 1 ve 3'te; trampet sekizlik → onaltılık → otuzikilik, sesi artarak
for (let v = 0; v < 4; v += 2) kick(T0 - 2 * OLCU + v * V, 0.8);
for (let k = 0; k < 8; k++) trampet(T0 - 2 * OLCU + k * (V / 2), 0.3 + 0.2 * (k / 8));
for (let k = 0; k < 12; k++) trampet(T0 - OLCU + k * (V / 4), 0.5 + 0.4 * (k / 12));
for (let k = 0; k < 8; k++) trampet(T0 - OLCU + 3 * V + k * (V / 8), 0.9 + 0.3 * (k / 8), 0.08);

// Ana kısım: 8 ölçü
for (let o = 0; o < 8; o++) {
  const bas = T0 + o * OLCU;
  for (let v = 0; v < 4; v++) {
    const b = bas + v * V;
    kick(b);
    if (v === 1 || v === 3) alkis(b);
    hihat(b + V / 2, 1, true);
    if (o >= 4) { hihat(b + V / 4, 0.45); hihat(b + (3 * V) / 4, 0.45); }
  }
  if (o === 3 || o === 7) for (let k = 0; k < 4; k++) trampet(bas + 3 * V + k * (V / 4), 0.5 + 0.15 * k); // ölçü sonu dolgusu
}
kick(TSON, 1.2);

/* ---------- 3) Pompalanan bas: vuruş aralarında (offbeat) akorun kökü ---------- */
for (let o = 0; o < 8; o++) {
  const kok = AKOR[akorAdi(o)][0] - 24;
  for (let v = 0; v < 4; v++) {
    const b = T0 + o * OLCU + v * V + V / 2;
    let fz = 0, lp = 0;
    for (let i = Math.floor(b * SR); i < (b + V / 2) * SR && i < N; i++) {
      const t = i / SR - b;
      fz = (fz + hz(kok) / SR) % 1;
      lp += 0.06 * ((2 * fz - 1) - lp);
      const zarf = Math.min(1, t / 0.005) * Math.min(1, (V / 2 - t) / 0.02);
      ekle(i, (lp * 1.4 + Math.sin(2 * Math.PI * fz) * 0.6) * zarf * 0.33);
    }
  }
}
// Son akorun derin basi
for (let i = Math.floor(TSON * SR); i < N; i++) {
  const t = i / SR - TSON;
  ekle(i, Math.sin(2 * Math.PI * hz(36) * t) * Math.exp(-t * 0.8) * 0.3);
}

/* ---------- 4) Hızlı melodi (onaltılık arpej), 2. ölçüden itibaren ---------- */
const DESEN = [0, 2, 4, 5, 3, 4, 2, 4, 0, 2, 4, 5, 6, 5, 4, 2];
for (let o = 2; o < 8; o++) {
  const a = AKOR[akorAdi(o)];
  const genis = [a[0], a[1], a[2], a[0] + 12, a[1] + 12, a[2] + 12, a[0] + 24];
  for (let s = 0; s < 16; s++) {
    const b = T0 + o * OLCU + s * (V / 4);
    const f = hz(genis[DESEN[s]] + 12);
    for (let i = Math.floor(b * SR); i < (b + 0.25) * SR && i < N; i++) {
      const t = i / SR - b;
      const fz = 2 * Math.PI * f * t;
      const d = Math.sin(fz) + 0.33 * Math.sin(3 * fz) + 0.15 * Math.sin(5 * fz);
      ekle(i, d * Math.min(1, t / 0.003) * Math.exp(-t * 14) * 0.075 * (o >= 4 ? 1.15 : 1), s % 2 ? 0.45 : -0.45);
    }
  }
}

/* ---------- 4b) Açılışta nabız gibi atan yumuşak melodi (sekizlik), patlamaya kadar ---------- */
for (let k = 0; T0 - k * (V / 2) > 0; k++) {
  const b = T0 - (k + 1) * (V / 2);
  if (b < 0) break;
  const a = AKOR[akorAdi(olcuNo(b))];
  const f = hz([a[0], a[2], a[1] + 12, a[2]][k % 4]);
  const guc = 0.5 + 0.5 * (b / T0);
  for (let i = Math.floor(b * SR); i < (b + 0.3) * SR && i < N; i++) {
    const t = i / SR - b;
    ekle(i, Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.004) * Math.exp(-t * 9) * 0.28 * guc, k % 2 ? 0.3 : -0.3);
  }
}

/* ---------- 5) Yükselen ses (riser) ve çarpma (impact) ---------- */
{
  const bas = T0 - 2 * OLCU;
  let lp = 0, fz = 0;
  for (let i = Math.floor(bas * SR); i < T0 * SR && i < N; i++) {
    const t = i / SR, p = (t - bas) / (T0 - bas);
    const kesim = 300 * Math.pow(9000 / 300, p);
    lp += (1 - Math.exp((-2 * Math.PI * kesim) / SR)) * (gurultu() - lp);
    fz += hz(48 + 36 * p) / SR;
    ekle(i, (lp * 0.22 + Math.sin(2 * Math.PI * fz) * 0.05) * p * p);
  }
}
const carpma = (b, guc) => {
  let lp = 0;
  for (let i = Math.floor(b * SR); i < (b + 2.5) * SR && i < N; i++) {
    const t = i / SR - b;
    const boom = Math.sin(2 * Math.PI * (32 + 40 * Math.exp(-t * 6)) * t) * Math.exp(-t * 2.2);
    const g = gurultu(); lp += 0.5 * (g - lp);
    const zil = (g - lp) * Math.exp(-t * 1.8) * 0.35;
    ekle(i, (boom * 0.6 + zil) * guc, 0);
  }
};
carpma(T0, 1);
carpma(TSON, 1.1);

/* ---------- Son işlemler: hafif yankı, sıkıştırma (yumuşak doyum), açılış/kapanış ---------- */
const yanki = (k, sn, geri) => { const g = Math.floor(sn * SR); for (let i = g; i < N; i++) k[i] += k[i - g] * geri; };
yanki(L, (3 * V) / 4, 0.18);
yanki(R, V / 2, 0.18);

let tepe = 0;
for (let i = 0; i < N; i++) tepe = Math.max(tepe, Math.abs(L[i]), Math.abs(R[i]));
const SURUS = 1.8, BOL = Math.tanh(SURUS);
const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const genel = Math.min(1, t / 0.3) * Math.min(1, (SURE - t) / 1.2);
  const s = (x) => Math.round((Math.tanh((x / tepe) * SURUS) / BOL) * 0.95 * genel * 32767);
  pcm.writeInt16LE(s(L[i]), i * 4);
  pcm.writeInt16LE(s(R[i]), i * 4 + 2);
}

const baslik = Buffer.alloc(44);
baslik.write("RIFF", 0); baslik.writeUInt32LE(36 + pcm.length, 4); baslik.write("WAVE", 8);
baslik.write("fmt ", 12); baslik.writeUInt32LE(16, 16); baslik.writeUInt16LE(1, 20); baslik.writeUInt16LE(2, 22);
baslik.writeUInt32LE(SR, 24); baslik.writeUInt32LE(SR * 4, 28); baslik.writeUInt16LE(4, 32); baslik.writeUInt16LE(16, 34);
baslik.write("data", 36); baslik.writeUInt32LE(pcm.length, 40);

const cikti = path.join(__dirname, "..", "public", "muzik.wav");
fs.writeFileSync(cikti, Buffer.concat([baslik, pcm]));
console.log("yazıldı:", cikti, (pcm.length / 1e6).toFixed(1) + " MB,", SURE + " sn; patlama " + T0.toFixed(2) + " sn, son akor " + TSON.toFixed(2) + " sn");
