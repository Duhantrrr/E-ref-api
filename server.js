const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());

// --- AYARLAR ---
const MONGO_URI = "mongodb+srv://duhantural2429_db_user:d8UKJ7gimz6tLUt5@cluster0.4x2bbc3.mongodb.net/esrefusta?retryWrites=true&w=majority&appName=Cluster0";
const IMGBB_API_KEY = "5f1853678205dfce150c01e32e81a98e";
const ADMIN_PASS = "DuhanTural24";

// MongoDB Bağlantısı
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Bağlantısı Başarılı ✅"))
    .catch(err => console.error("MongoDB Hatası ❌:", err));

// Ürün Şeması
const UrunSchema = new mongoose.Schema({
    ad: String,
    fiyat: Number,
    kategori: String,
    img: String
});
const Urun = mongoose.model('Urun', UrunSchema);

// Resimleri Bellekte Tutma (Multer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 1. ÜRÜNLERİ LİSTELE (Müşteriler için)
app.get('/api/urunler', async (req, res) => {
    try {
        const urunler = await Urun.find();
        res.json(urunler);
    } catch (err) {
        res.status(500).json({ mesaj: "Hata" });
    }
});

// 2. ÜRÜN EKLE / GÜNCELLE + IMGBB YÜKLEME
app.post('/api/urunler', upload.single('gorsel'), async (req, res) => {
    const { ad, fiyat, kategori, sifre } = req.body;
    if (sifre !== ADMIN_PASS) return res.status(401).json({ mesaj: "Yetkisiz" });

    try {
        let resimLink = "";
        if (req.file) {
            const form = new FormData();
            form.append('image', req.file.buffer.toString('base64'));
            const imgbbRes = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, form);
            resimLink = imgbbRes.data.data.url;
        }

        // Ürün varsa güncelle, yoksa yeni oluştur
        const filtre = { ad: new RegExp(`^${ad}$`, 'i') };
        const guncelleme = { fiyat: Number(fiyat), kategori: kategori };
        if (resimLink) guncelleme.img = resimLink;

        const sonuc = await Urun.findOneAndUpdate(filtre, guncelleme, { upsert: true, new: true });
        res.json({ mesaj: "Başarılı", urun: sonuc });
    } catch (err) {
        res.status(500).json({ mesaj: "İşlem hatası" });
    }
});

// 3. ÜRÜN SİL
app.delete('/api/urunler/:id', async (req, res) => {
    try {
        await Urun.findByIdAndDelete(req.params.id);
        res.json({ mesaj: "Silindi" });
    } catch (err) {
        res.status(404).json({ mesaj: "Bulunamadı" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Eşref Usta API Aktif: ${PORT}`));
