"""Uygulama ikonlarını üretir: ikonlar/ikon-192.png ve ikonlar/ikon-512.png

Neden betik? PNG dosyaları elle yazılamaz; bir çizim programı ya da resim
kütüphanesi de kurmak istemedik. Bu betik yalnızca Python'un kendi
kütüphanesini (zlib, struct) kullanır ve logoyu piksel piksel hesaplar:
lacivert zemin, sonar halkaları, turuncu hedef noktası.

İkonlar depoda hazır durur; bu betiği yalnızca logoyu değiştirmek istersen
yeniden çalıştırman gerekir:
    python araclar/ikon-uret.py
"""
import math
import os
import struct
import zlib

ZEMIN = (11, 34, 49)        # #0b2231
HALKA = (159, 192, 200)     # #9fc0c8
BEYAZ = (255, 255, 255)
TURUNCU = (238, 106, 47)    # #ee6a2f


def karistir(alt, ust, oran):
    """İki rengi karıştırır (oran 0 = alt, 1 = üst). Kenar yumuşatma için."""
    oran = max(0.0, min(1.0, oran))
    return tuple(round(a + (u - a) * oran) for a, u in zip(alt, ust))


def piksel(x, y, boyut):
    """(x, y) pikselinin rengini hesaplar. Koordinatlar 0-40 arası bir tuvale
    ölçeklenir; logo ortadaki %70'lik alana çizilir (maskelenebilir ikonlarda
    kenarlar kırpıldığı için güvenli bölge)."""
    olcek = boyut / 40.0
    u = (x + 0.5) / olcek
    v = (y + 0.5) / olcek
    # Logoyu merkeze doğru küçült: güvenli bölge
    u = 20 + (u - 20) / 0.7
    v = 20 + (v - 20) / 0.7
    kalinlik = 1.5
    yumusak = 0.7 / olcek / 0.7 + 0.25   # kenar yumuşatma genişliği

    renk = ZEMIN
    uzaklik = math.hypot(u - 20, v - 20)

    def halka(yaricap, cizgi_rengi, saydamlik):
        nonlocal renk
        kenar = abs(uzaklik - yaricap) - kalinlik / 2
        renk = karistir(renk, cizgi_rengi, (0.5 - kenar / yumusak) * saydamlik)

    halka(17, HALKA, 0.5)
    halka(11, HALKA, 0.8)
    halka(5, BEYAZ, 1.0)

    # Merkezden sağ üste giden tarama çizgisi: (20,20) -> (32,9)
    ax, ay, bx, by = 20, 20, 32, 9
    t = ((u - ax) * (bx - ax) + (v - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)
    t = max(0.0, min(1.0, t))
    cizgiye_uzaklik = math.hypot(u - (ax + t * (bx - ax)), v - (ay + t * (by - ay)))
    renk = karistir(renk, BEYAZ, 0.5 - (cizgiye_uzaklik - kalinlik / 2) / yumusak)

    # Turuncu hedef noktası
    nokta = math.hypot(u - 27, v - 26) - 3
    renk = karistir(renk, TURUNCU, 0.5 - nokta / yumusak)
    return renk


def png_yaz(yol, boyut):
    """RGB pikselleri sıkıştırıp PNG dosyası olarak yazar."""
    satirlar = bytearray()
    for y in range(boyut):
        satirlar.append(0)  # her satırın başında süzgeç türü (0 = yok)
        for x in range(boyut):
            satirlar.extend(piksel(x, y, boyut))

    def parca(tur, veri):
        return (struct.pack(">I", len(veri)) + tur + veri +
                struct.pack(">I", zlib.crc32(tur + veri) & 0xFFFFFFFF))

    baslik = struct.pack(">IIBBBBB", boyut, boyut, 8, 2, 0, 0, 0)  # 8 bit, RGB
    with open(yol, "wb") as dosya:
        dosya.write(b"\x89PNG\r\n\x1a\n")
        dosya.write(parca(b"IHDR", baslik))
        dosya.write(parca(b"IDAT", zlib.compress(bytes(satirlar), 9)))
        dosya.write(parca(b"IEND", b""))


if __name__ == "__main__":
    klasor = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ikonlar")
    os.makedirs(klasor, exist_ok=True)
    for boyut in (192, 512):
        yol = os.path.join(klasor, "ikon-%d.png" % boyut)
        png_yaz(yol, boyut)
        print("yazıldı:", os.path.normpath(yol))
