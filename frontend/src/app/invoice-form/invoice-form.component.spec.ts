import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], 
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.css']
})
export class InvoiceFormComponent {
  invoiceForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.invoiceForm = this.fb.group({
      clientName: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]],
      description: ['']
    });
  }

  submitInvoice() {
    if (this.invoiceForm.valid) {
      console.log('Invoice Data:', this.invoiceForm.value);
      alert('Invoice submitted successfully!');
      this.invoiceForm.reset(); 
    } else {
      alert('Please fill in all required fields.');
    }
  }
}
