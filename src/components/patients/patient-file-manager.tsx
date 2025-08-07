// Patient File Management Component
// Demonstrates comprehensive document management for patients

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  TestTube, 
  Pill, 
  CreditCard, 
  Share, 
  Download, 
  Trash2, 
  Eye,
  FolderOpen,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PatientFile {
  id: string;
  name: string;
  type: string;
  category: string;
  size: number;
  uploadDate: string;
  uploadedBy: string;
  url: string;
  isSharedWithPatient: boolean;
}

interface FileCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  uploadTypes: string[];
  required?: boolean;
  count: number;
}

interface PatientFileManagerProps {
  patientId: string;
  patientName: string;
  canEdit?: boolean;
}

export default function PatientFileManager({ 
  patientId, // eslint-disable-line @typescript-eslint/no-unused-vars
  patientName, 
  canEdit = true 
}: PatientFileManagerProps) {
  const [files, setFiles] = useState<PatientFile[]>([
    {
      id: '1',
      name: 'Blood Test Report.pdf',
      type: 'pdf',
      category: 'lab_reports',
      size: 245760,
      uploadDate: '2024-08-06',
      uploadedBy: 'Dr. Kumar',
      url: '#',
      isSharedWithPatient: true
    },
    {
      id: '2',
      name: 'Prescription_August.pdf',
      type: 'pdf',
      category: 'prescriptions',
      size: 128000,
      uploadDate: '2024-08-05',
      uploadedBy: 'Dr. Kumar',
      url: '#',
      isSharedWithPatient: true
    },
    {
      id: '3',
      name: 'Insurance_Card.jpg',
      type: 'image',
      category: 'insurance',
      size: 156000,
      uploadDate: '2024-08-04',
      uploadedBy: 'Staff Member',
      url: '#',
      isSharedWithPatient: false
    }
  ]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);

  const fileCategories: FileCategory[] = useMemo(() => [
    {
      id: 'all',
      name: 'All Files',
      icon: FolderOpen,
      color: 'bg-gray-500',
      uploadTypes: [],
      count: files.length
    },
    {
      id: 'identification',
      name: 'ID Documents',
      icon: CreditCard,
      color: 'bg-blue-500',
      uploadTypes: ['image/jpeg', 'image/png', 'application/pdf'],
      required: true,
      count: files.filter(f => f.category === 'identification').length
    },
    {
      id: 'lab_reports',
      name: 'Lab Reports',
      icon: TestTube,
      color: 'bg-green-500',
      uploadTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      count: files.filter(f => f.category === 'lab_reports').length
    },
    {
      id: 'prescriptions',
      name: 'Prescriptions',
      icon: Pill,
      color: 'bg-purple-500',
      uploadTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      count: files.filter(f => f.category === 'prescriptions').length
    },
    {
      id: 'medical_images',
      name: 'Medical Images',
      icon: Image,
      color: 'bg-orange-500',
      uploadTypes: ['image/jpeg', 'image/png', 'image/gif'],
      count: files.filter(f => f.category === 'medical_images').length
    },
    {
      id: 'insurance',
      name: 'Insurance',
      icon: CreditCard,
      color: 'bg-teal-500',
      uploadTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      count: files.filter(f => f.category === 'insurance').length
    },
    {
      id: 'documents',
      name: 'Other Documents',
      icon: FileText,
      color: 'bg-gray-500',
      uploadTypes: ['application/pdf', 'text/plain'],
      count: files.filter(f => f.category === 'documents').length
    }
  ], [files]);

  const filteredFiles = activeCategory === 'all' 
    ? files 
    : files.filter(file => file.category === activeCategory);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const getCurrentCategory = useCallback(() => {
    return fileCategories.find(cat => cat.id === activeCategory);
  }, [activeCategory, fileCategories]);

  const handleFileUpload = useCallback(async (fileList: File[]) => {
    const activeCategory = getCurrentCategory();
    if (!activeCategory || activeCategory.id === 'all') {
      alert('Please select a specific category to upload files');
      return;
    }

    for (const file of fileList) {
      // Validate file type
      if (!activeCategory.uploadTypes.includes(file.type)) {
        alert(`Invalid file type for ${activeCategory.name}. Allowed types: ${activeCategory.uploadTypes.join(', ')}`);
        continue;
      }

      // Simulate upload progress
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      // Simulate upload
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
      }

      // Add to files list
      const newFile: PatientFile = {
        id: Date.now().toString(),
        name: file.name,
        type: file.type.split('/')[1],
        category: activeCategory.id,
        size: file.size,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: 'Current User',
        url: '#',
        isSharedWithPatient: false
      };

      setFiles(prev => [...prev, newFile]);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
    }
  }, [getCurrentCategory]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileUpload(droppedFiles);
  }, [handleFileUpload]);

  const handleFileAction = (action: string, file: PatientFile) => {
    switch (action) {
      case 'view':
        console.log('Viewing file:', file.name);
        // In real app: open file preview modal
        break;
      case 'download':
        console.log('Downloading file:', file.name);
        // In real app: initiate download
        break;
      case 'share':
        console.log('Sharing file:', file.name);
        // In real app: toggle patient sharing
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, isSharedWithPatient: !f.isSharedWithPatient }
            : f
        ));
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this file?')) {
          setFiles(prev => prev.filter(f => f.id !== file.id));
        }
        break;
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-8 w-8 text-blue-500" />; {/* eslint-disable-line jsx-a11y/alt-text */}
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Files</h2>
          <p className="text-gray-600">Manage documents for {patientName}</p>
        </div>
        {canEdit && (
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        id="file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(Array.from(e.target.files));
          }
        }}
      />

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {fileCategories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{category.name}</span>
              {category.count > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {category.count}
                </Badge>
              )}
              {category.required && (
                <span className="text-red-500 text-xs">*</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upload Area */}
      {canEdit && activeCategory !== 'all' && (
        <Card 
          className={`border-2 border-dashed transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload files to {getCurrentCategory()?.name}
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supported formats: {getCurrentCategory()?.uploadTypes.join(', ')}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              Browse Files
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploading Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{fileName}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Grid */}
      {filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  {getFileIcon(file.type)}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileAction('view', file)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFileAction('download', file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileAction('share', file)}
                          className={file.isSharedWithPatient ? 'text-green-600' : 'text-gray-400'}
                        >
                          <Share className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileAction('delete', file)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{file.uploadDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">by {file.uploadedBy}</span>
                    {file.isSharedWithPatient && (
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Shared
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No files in {getCurrentCategory()?.name || 'this category'}
            </h3>
            <p className="text-gray-500 mb-4">
              {canEdit 
                ? 'Upload files to get started' 
                : 'No files have been uploaded yet'
              }
            </p>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First File
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
