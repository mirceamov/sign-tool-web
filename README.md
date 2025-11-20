# 🔐 Sign Tool Web - PDF Electronic Signature

Angular web application for signing PDF documents using local USB token.

## 🚀 Features

- ✅ PDF file upload and preview
- ✅ Integration with local SignTool daemon
- ✅ Real-time service status monitoring
- ✅ Signed PDF download
- ✅ User-friendly interface

## 🛠️ Technologies

- **Angular 19**
- **TypeScript**
- **RxJS**
- **Bootstrap/Custom CSS**

## 📦 Installation

```bash
npm install
```

## 🏃 Development Server
ng serve

## Required Services
This app requires SignToolDaemon running locally on http://localhost:5000

## 📁 Project Structure
src/
├── app/
│   ├── components/
│   │   └── pdf-signer/
│   ├── services/
│   │   └── sign.service.ts
│   └── models/
│       └── sign-request.model.ts

## 🌐 Deployment
Deploy to Azure App Service or any static hosting service.

## 📄 License
MIT