const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json());

// --- CLOUDINARY AYARLARI (Senin Bilgilerinle Güncellendi) ---
cloudinary.config({ 
  cloud_name: 'db9c3fs4o', 
  api_key: '622731167898466', 
  api_secret: 'nOb1TJ88PeTI61tPiLAViBe8z5c' 
});

// --- MONGODB VE ŞİFRE AYARLARI ---
const MONGO_URI = "mongodb+srv://duhantural2429_db_user:d8UKJ7gimz6tLUt5@cluster0.4x2bbc3.mongodb.net/esrefusta?retryWrites=true&w=majority&appName=Cluster0";
const ADMIN_PASS = "DuhanTural24";

// MongoDB Bağlantısı
mongoose.connect(MONGO_URI)
    .then(() => console.log("Eşref Usta MongoDB Bağlandı ✅"))
    .catch(err => console.error("MongoDB Hatası ❌:", err));

// Ürün Şeması
const UrunSchema = new mongoose.Schema({
    ad: { type: String, required: true },
    fiyat: { type: Number, required: true },
    kategori: { type: String, required: true },
    img: { type: String, default: "" }
}, { collection: 'urunler' });

const Urun = mongoose.model('Urun', UrunSchema);

// Resim yükleme motoru (RAM'de tutar)
const upload = multer({ storage: multer.memoryStorage() });

// 1. ÜRÜNLERİ LİSTELE (Müşteri Menüsü İçin)
app.get('/api/urunler', async (req, res) => {
    try {
        const urunler = await Urun.find();
        res.json(urunler);
    } catch (err) {
        res.status(500).json({ mesaj: "Veriler çekilemedi" });
    }
});

// 2. ÜRÜN EKLE VEYA GÜNCELLE + CLOUDINARY YÜKLEME
app.post('/api/urunler', upload.single('gorsel'), async (req, res) => {
    const { ad, fiyat, kategori, sifre } = req.body;

    if (sifre !== ADMIN_PASS) {
        return res.status(401).json({ mesaj: "Şifre Yanlış!" });
    }

    try {
        let resimUrl = "";
        
        // Eğer yeni fotoğraf seçildiyse Cloudinary'ye yükle
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            
            const result = await cloudinary.uploader.upload(dataURI, {
                folder: "esref_usta_menu",
                resource_type: "auto"
            });
            resimUrl = result.secure_url;
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
        res.json({ mesaj: "Ürün Başarıyla Kaydedildi! ✅", urun: sonuc });
    } catch (err) {
        console.error("Hata:", err);
        res.status(500).json({ mesaj: "Cloudinary veya Sunucu hatası oluştu!" });
    }
});

// 3. ÜRÜN SİL
app.delete('/api/urunler/:id', async (req, res) => {
    try {
        await Urun.findByIdAndDelete(req.params.id);
        res.json({ mesaj: "Ürün silindi" });
    } catch (err) {
        res.status(404).json({ mesaj: "Ürün bulunamadı" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Aktif: ${PORT}`));
