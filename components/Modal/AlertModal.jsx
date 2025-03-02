import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

const AlertModal = ({ isOpen, onClose, title, message, type = 'error', onConfirm }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white rounded-lg shadow-lg max-w-md mx-auto">
        <AlertDialogHeader className="flex items-center gap-3">
          {type === 'error' ? (
            <AlertCircle className="h-6 w-6 text-red-500" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          )}
          <AlertDialogTitle className="text-lg font-semibold">
            {title}
          </AlertDialogTitle>
        </AlertDialogHeader>
        
        <AlertDialogDescription className="text-center py-4 text-gray-600">
          {message}
        </AlertDialogDescription>
        
        <AlertDialogFooter>
          {type === 'error' ? (
            <AlertDialogAction 
              className="w-full bg-red-500 text-white hover:bg-red-600 rounded-md py-2"
              onClick={onClose}
            >
              OK
            </AlertDialogAction>
          ) : (
            <AlertDialogAction 
              className="w-full bg-green-500 text-white hover:bg-green-600 rounded-md py-2"
              onClick={() => {
                onConfirm && onConfirm();
                onClose();
              }}
            >
              OK
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AlertModal;