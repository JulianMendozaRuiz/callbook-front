import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function callIdLengthValidator(requiredLength: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }
    
    const trimmedValue = control.value.trim();
    if (trimmedValue.length !== requiredLength) {
      return { 
        callIdLength: { 
          actualLength: trimmedValue.length, 
          requiredLength: requiredLength 
        } 
      };
    }
    
    return null;
  };
}