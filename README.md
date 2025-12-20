# 🖼️ تطبيق استعادة الصور - Image Restoration Web App

تطبيق ويب متكامل لاستعادة الصور التالفة والمتشققة مع الحفاظ على الملامح الأصلية.

A complete web application for restoring damaged and cracked images while preserving original features.

## ✨ المميزات - Features

### 🔧 معالجة الصور - Image Processing
- **إصلاح شامل للصور** - Comprehensive image restoration
- **إزالة الضوضاء** - Advanced noise removal using Non-local Means Denoising
- **تحسين الجودة** - Quality enhancement (sharpness, contrast, brightness)
- **إصلاح التشققات** - Crack repair using Inpainting techniques
- **معالجة محلية بالكامل** - 100% local processing in browser

### 🎨 الواجهة الرسومية - User Interface
- واجهة عربية/إنجليزية ثنائية اللغة - Bilingual Arabic/English interface
- رفع الصور بالسحب والإفلات - Drag and drop image upload
- معاينة مباشرة للصورة الأصلية والمعالجة - Live preview of original and processed images
- أدوات تحكم متقدمة بالمعاملات - Advanced parameter controls
- حفظ وتحميل الإعدادات - Save/load settings
- تحميل الصورة المعالجة - Download processed images

### ⚙️ معاملات قابلة للتخصيص - Customizable Parameters

#### إزالة الضوضاء - Denoising
- قوة إزالة الضوضاء (3-15) - Denoise strength
- معامل اللون (3-15) - Color parameter

#### التحسين - Enhancement
- حدة الصورة (0-2) - Sharpness amount
- التباين (0.5-2) - Contrast
- السطوع (-50 إلى +50) - Brightness

#### إصلاح التشققات - Crack Repair
- حجم الكشف (1-7) - Detection size
- نطاق الإصلاح (1-10) - Inpainting radius

## 🚀 التقنيات المستخدمة - Technologies Used

- **HTML5 Canvas** - For image rendering and manipulation
- **OpenCV.js** - Advanced computer vision algorithms
- **Pure JavaScript** - No frameworks required
- **CSS3** - Modern, responsive design
- **LocalStorage** - Settings persistence

## 📋 المتطلبات - Requirements

- متصفح حديث يدعم HTML5 Canvas - Modern browser with HTML5 Canvas support
- JavaScript مفعل - JavaScript enabled
- اتصال بالإنترنت (لتحميل OpenCV.js فقط) - Internet connection (for OpenCV.js loading only)

## 🚨 مهم: إذا لم يعمل التطبيق

إذا واجهت مشاكل في تحميل الصور أو المعالجة:

1. **جرب ملف الاختبار البسيط أولاً**: افتح `test-simple.html` للتأكد من أن المتصفح يدعم تحميل الصور
2. **استخدم Web Server**: بدلاً من فتح الملف مباشرة، استخدم web server محلي
3. **راجع دليل حل المشاكل**: افتح `TROUBLESHOOTING.md` للحلول التفصيلية
4. **ميزة جديدة**: "تحسين الجودة" يعمل الآن بدون OpenCV.js!

### 📱 للاستخدام على الموبايل:
- يُنصح باستخدام web server أو رفع الملفات على GitHub Pages
- OpenCV.js قد يستغرق 10-30 ثانية للتحميل على اتصال 3G/4G
- جميع الميزات تعمل بعد تحميل OpenCV.js

## 🎯 كيفية الاستخدام - How to Use

1. **فتح التطبيق** - Open the Application
   - افتح ملف `index.html` في متصفحك
   - Open `index.html` in your browser

2. **رفع صورة** - Upload an Image
   - اسحب وأفلت صورة على منطقة الرفع
   - Drag and drop an image or click to select
   - أو انقر على زر "اختر صورة"

3. **اختيار عملية المعالجة** - Choose Processing Operation
   - **إصلاح الصورة**: معالجة شاملة (إزالة ضوضاء + تحسين)
   - **Restore Image**: Complete restoration (denoising + enhancement)
   
   - **إزالة الضوضاء**: إزالة التشويش والحبيبات
   - **Denoise**: Remove noise and grain
   
   - **تحسين الجودة**: تحسين الحدة والتباين
   - **Enhance**: Improve sharpness and contrast
   
   - **إصلاح التشققات**: إصلاح الخطوط والشقوق
   - **Inpaint**: Repair cracks and scratches

4. **ضبط المعاملات** - Adjust Parameters
   - استخدم أشرطة التمرير لضبط الإعدادات
   - Use sliders to adjust processing parameters
   - شاهد التأثير مباشرة على الصورة المعالجة
   - See the effect immediately on the processed image

5. **حفظ النتيجة** - Save Result
   - انقر على "تحميل الصورة" لحفظ النتيجة
   - Click "Download Image" to save the result
   - الصورة تُحفظ بصيغة PNG عالية الجودة
   - Image is saved in high-quality PNG format

## 🔧 الخوارزميات المستخدمة - Algorithms Used

### Non-local Means Denoising
خوارزمية متقدمة لإزالة الضوضاء تحافظ على التفاصيل الدقيقة والحواف.
Advanced denoising algorithm that preserves fine details and edges.

### Inpainting (TELEA)
تقنية لملء المناطق المفقودة أو التالفة في الصورة باستخدام المعلومات المحيطة.
Technique to fill missing or damaged regions using surrounding information.

### Histogram Equalization
تحسين التباين من خلال توزيع أفضل لمستويات السطوع.
Contrast enhancement through better distribution of brightness levels.

### Canny Edge Detection
كشف الحواف والتشققات في الصور.
Edge and crack detection in images.

### Morphological Operations
عمليات مورفولوجية للكشف والمعالجة.
Morphological operations for detection and processing.

## 📁 هيكل المشروع - Project Structure

```
image-restoration-app/
├── index.html          # الملف الرئيسي - Main HTML file
├── styles.css          # ملف التنسيقات - Styles
├── app.js              # منطق التطبيق - Application logic
└── README.md           # هذا الملف - This file
```

## 🎨 مميزات الواجهة - UI Features

- تصميم عصري وجذاب - Modern and attractive design
- دعم الوضع الليلي للخلفية - Dark gradient background
- رسوم متحركة سلسة - Smooth animations
- دعم RTL للعربية - RTL support for Arabic
- تصميم متجاوب - Responsive design
- مؤشرات تحميل مرئية - Visual loading indicators

## 🔒 الأمان والخصوصية - Security & Privacy

- **معالجة محلية بالكامل**: جميع العمليات تتم في متصفحك
- **100% Local Processing**: All operations happen in your browser
- **لا يتم رفع الصور**: لا يتم إرسال أي بيانات إلى الخوادم
- **No Upload Required**: No data is sent to any servers
- **خصوصية تامة**: صورك تبقى على جهازك
- **Complete Privacy**: Your images stay on your device

## 🌐 التوافق - Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Opera 76+

## 📝 ملاحظات - Notes

- يُنصح باستخدام صور بحجم معقول (أقل من 5MB) للحصول على أداء أفضل
- Recommended to use reasonably sized images (< 5MB) for better performance

- أول تحميل قد يستغرق وقتاً لتحميل مكتبة OpenCV.js
- First load may take time to download OpenCV.js library

- جميع الإعدادات تُحفظ محلياً في المتصفح
- All settings are saved locally in the browser

## 🤝 المساهمة - Contributing

نرحب بالمساهمات والاقتراحات لتحسين التطبيق!
Contributions and suggestions are welcome!

## 📄 الترخيص - License

هذا المشروع مفتوح المصدر ومتاح للاستخدام الحر.
This project is open source and available for free use.

## 🙏 شكر وتقدير - Acknowledgments

- **OpenCV.js** - For powerful computer vision algorithms
- **HTML5 Canvas API** - For image manipulation capabilities

---

صُنع بـ ❤️ | Made with ❤️
