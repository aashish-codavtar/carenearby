const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const Document = require('../models/Document');
const PSWProfile = require('../models/PSWProfile');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

let blobPut = null;
if (process.env.BLOB_READ_WRITE_TOKEN) {
  blobPut = async (pathName, body, options) => {
    const response = await fetch(`https://public.blob.vercel-storage.com/${pathName}`, {
      method: 'PUT',
      headers: {
        'x-vercel-blob-token': process.env.BLOB_READ_WRITE_TOKEN,
        'Content-Type': options?.contentType || 'application/octet-stream',
      },
      body,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Blob upload failed: ${response.status} - ${errText}`);
    }
    return { url: `https://public.blob.vercel-storage.com/${pathName}`, pathname: pathName };
  };
}

async function compressImage(buffer, mimeType) {
  if (!mimeType || !mimeType.startsWith('image/')) {
    return buffer;
  }
  
  try {
    const compressed = await sharp(buffer)
      .resize(1920, 1920, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: 70 })
      .toBuffer();
    return compressed;
  } catch (err) {
    console.error('Image compression failed:', err);
    return buffer;
  }
}

router.post(
  '/upload',
  authenticate,
  requireRole('PSW'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { docType, label, entityType = 'PSW' } = req.body;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      if (!docType) return res.status(400).json({ error: 'docType is required' });

      const VALID_DOC_TYPES = ['police_check', 'psw_certificate', 'first_aid_cert', 'driver_license', 'insurance', 'id_proof', 'photo', 'resume', 'other'];
      if (!VALID_DOC_TYPES.includes(docType)) return res.status(400).json({ error: 'Invalid docType' });

      const profile = await PSWProfile.findOne({ userId: req.user._id });
      if (!profile) return res.status(404).json({ error: 'PSW profile not found' });

      let fileUrl = '', storagePath = '', dataUrl = '';
      let fileBuffer = req.file?.buffer;
      
      // Compress image before uploading
      if (fileBuffer && req.file?.mimetype?.startsWith('image/')) {
        try {
          fileBuffer = await compressImage(fileBuffer, req.file.mimetype);
        } catch (compressErr) {
          console.error('Compression error:', compressErr);
        }
      }

      // Try Vercel Blob upload with compressed image
      if (blobPut && fileBuffer) {
        try {
          const ext = req.file.mimetype === 'application/pdf' ? 'pdf' : 'jpg';
          const blobPath = `${profile._id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const blob = await blobPut(blobPath, fileBuffer, { contentType: req.file.mimetype });
          fileUrl = blob.url;
          storagePath = blob.pathname;
        } catch (blobErr) { 
          console.error('Blob upload error:', blobErr); 
        }
      }

      // Minimal fallback: Only store tiny thumbnail for preview, not full base64
      // This keeps database small and fast
      if (!fileUrl && fileBuffer && req.file?.mimetype?.startsWith('image/')) {
        try {
          const thumbnail = await sharp(fileBuffer)
            .resize(300, 300, { fit: 'cover' })
            .jpeg({ quality: 50 })
            .toBuffer();
          dataUrl = `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
        } catch (thumbErr) {
          console.error('Thumbnail generation failed:', thumbErr);
        }
      }

      const document = await Document.create({
        entityType, entityId: profile._id, docType, label: label || '',
        fileName: req.file.originalname, originalName: req.file.originalname,
        mimeType: req.file.mimetype, size: fileBuffer?.length || req.file.size,
        storagePath, url: fileUrl, dataUrl, status: 'PENDING',
      });

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: { id: document._id, docType: document.docType, label: document.label, status: document.status, url: document.url || document.dataUrl, submittedAt: document.submittedAt }
      });
    } catch (err) { console.error('Document upload error:', err); res.status(500).json({ error: 'Server error' }); }
  }
);

router.get('/my-documents', authenticate, requireRole('PSW'), async (req, res) => {
  const profile = await PSWProfile.findOne({ userId: req.user._id });
  if (!profile) return res.status(404).json({ error: 'PSW profile not found' });
  const documents = await Document.find({ entityType: 'PSW', entityId: profile._id, isActive: true }).sort({ submittedAt: -1 });
  res.json({ documents });
});

router.delete('/:id', authenticate, requireRole('PSW'), async (req, res) => {
  const mongoose = require('mongoose');
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid document ID' });
  const profile = await PSWProfile.findOne({ userId: req.user._id });
  if (!profile) return res.status(404).json({ error: 'PSW profile not found' });
  const document = await Document.findOne({ _id: req.params.id, entityType: 'PSW', entityId: profile._id });
  if (!document) return res.status(404).json({ error: 'Document not found' });
  if (document.status === 'APPROVED') return res.status(400).json({ error: 'Cannot delete approved documents' });
  document.isActive = false;
  await document.save();
  res.json({ message: 'Document deleted' });
});

module.exports = router;
