const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = './veritabani.json';
const IMGBB_API_KEY = '5f1853678205dfce150c01e32e81a98e'; 

// Resimleri RAM'de tutmak için (Multer Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// JSON Veritabanını kontrol et/oluştur
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

// 1. ÜRÜNLERİ GETİR
app.get('/api/urunler', (req, res) => {
    const veriler = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    res.json(veriler);
});

// 2. ÜRÜN EKLE / GÜNCELLE + IMGBB YÜKLEME
app.post('/api/urunler', upload.single('gorsel'), async (req, res) => {
    const { ad, fiyat, kategori, sifre } = req.body;

    if (sifre !== "DuhanTural24") {
        return res.status(401).json({ mesaj: "Yetkisiz Erişim" });
    }

    try {
        let finalImgUrl = "";

        // Eğer yeni bir dosya yüklendiyse ImgBB'ye gönder
        if (req.file) {
            const form = new FormData();
            form.append('image', req.file.buffer.toString('base64'));

            const imgbbRes = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, form);
            finalImgUrl = imgbbRes.data.data.url;
        }

        let urunler = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        const urunIndex = urunler.findIndex(u => u.ad.toLowerCase() === ad.toLowerCase());

        const yeniUrun = {
            id: urunIndex > -1 ? urunler[urunIndex].id : Date.now().toString(),
            ad,
            fiyat,
            kategori,
            img: finalImgUrl || (urunIndex > -1 ? urunler[urunIndex].img : "https://via.placeholder.com/150")
        };

        if (urunIndex > -1) urunler[urunIndex] = yeniUrun;
        else urunler.push(yeniUrun);

        fs.writeFileSync(DB_FILE, JSON.stringify(urunler, null, 2));
        res.status(201).json({ mesaj: "Başarılı", urun: yeniUrun });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mesaj: "Sistem hatası veya ImgBB hatası" });
    }
});

// 3. ÜRÜN SİL
app.delete('/api/urunler/:id', (req, res) => {
    let urunler = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const yeniListe = urunler.filter(u => u.id !== req.params.id);
    fs.writeFileSync(DB_FILE, JSON.stringify(yeniListe, null, 2));
    res.json({ mesaj: "Ürün silindi" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Eşref Usta API Aktif: ${PORT}`));
