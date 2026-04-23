const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());

// --- AYARLARIN ---
const MONGO_URI = "mongodb+srv://duhantural2429_db_user:d8UKJ7gimz6tLUt5@cluster0.4x2bbc3.mongodb.net/esrefusta?retryWrites=true&w=majority&appName=Cluster0";
const IMGBB_API_KEY = "5f1853678205dfce150c01e32e81a98e";
const ADMIN_PASS = "DuhanTural24";

// MongoDB Bağlantısı
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Bağlandı ✅"))
    .catch(err => console.error("MongoDB Bağlantı Hatası ❌:", err));

// Ürün Şeması (Tablo yapısı)
const UrunSchema = new mongoose.Schema({
    ad: String,
    fiyat: Number,
    kategori: String,
    img: String
}, { collection: 'urunler' });

const Urun = mongoose.model('Urun', UrunSchema);

// Resim yükleme motoru
const upload = multer({ storage: multer.memoryStorage() });

// 1. TÜM ÜRÜNLERİ LİSTELE (Müşteri Menüsü İçin)
app.get('/api/urunler', async (req, res) => {
    try {
        const veriler = await Urun.find();
        res.json(veriler);
    } catch (err) {
        res.status(500).json({ mesaj: "Veriler alınamadı" });
    }
});

// 2. ÜRÜN EKLE VEYA GÜNCELLE (Admin Paneli İçin)
app.post('/api/urunler', upload.single('gorsel'), async (req, res) => {
    const { ad, fiyat, kategori, sifre } = req.body;

    if (sifre !== ADMIN_PASS) {
        return res.status(401).json({ mesaj: "Yetkisiz erişim!" });
    }

    try {
        let resimUrl = "";
        
        // Eğer yeni bir fotoğraf seçildiyse ImgBB'ye yükle
        if (req.file) {
            const form = new FormData();
            form.append('image', req.file.buffer.toString('base64'));
            const imgbbRes = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, form);
            resimUrl = imgbbRes.data.data.url;
        }

        // Ürün ismine göre bul ve güncelle, yoksa yeni oluştur (Upsert)
        const filtre = { ad: new RegExp(`^${ad}$`, 'i') };
        const guncelleme = { 
            ad: ad,
            fiyat: Number(fiyat), 
            kategori: kategori 
        };
        if (resimUrl) guncelleme.img = resimUrl;

        const sonuc = await Urun.findOneAndUpdate(filtre, guncelleme, { upsert: true, new: true });
        res.json({ mesaj: "Başarılı", urun: sonuc });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mesaj: "Bir hata oluştu" });
    }
});

// 3. ÜRÜN SİL
app.delete('/api/urunler/:id', async (req, res) => {
    try {
        await Urun.findByIdAndDelete(req.params.id);
        res.json({ mesaj: "Ürün başarıyla silindi" });
    } catch (err) {
        res.status(404).json({ mesaj: "Ürün bulunamadı" });
    }
});

// Sunucuyu Başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda aktif.`));
