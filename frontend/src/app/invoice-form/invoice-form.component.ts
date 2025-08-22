
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvoiceService } from '../invoice.service';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.css']
})
export class InvoiceFormComponent implements OnInit {
  invoiceForm: FormGroup;
  isEditMode = false;
  private currentInvoiceId: number | null = null;

  // State for post-creation success screen
  invoiceCreationSuccess = false;
  generatedPdfPath: string | null = null;
  statusMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.invoiceForm = this.fb.group({
      clientName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: [''],
      payment_status: ['Pending', Validators.required],
      items: this.fb.array([]),
      tax_rate: [18.00, [Validators.required, Validators.min(0)]] 

    });
  }

  get subtotal(): number {
    return this.items.controls.reduce((sum, control) => sum + (control.get('total')?.value || 0), 0);
  }

  get taxAmount(): number {
    const taxRate = this.invoiceForm.get('tax_rate')?.value || 0;
    return this.subtotal * (taxRate / 100);
  }

  get grandTotal(): number {
    return this.subtotal + this.taxAmount;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.currentInvoiceId = +id;
        this.loadInvoiceForEdit(this.currentInvoiceId);
      } else {
        this.isEditMode = false;
        this.addItem();
      }
    });
  }

  loadInvoiceForEdit(id: number): void {
    this.invoiceService.getInvoiceById(id).subscribe((data: any) => {
      this.invoiceForm.patchValue(data);
      this.items.clear();
      data.items.forEach((item: any) => {
        const itemGroup = this.fb.group({
          itemName: [item.itemName, Validators.required],
          quantity: [item.quantity, [Validators.required, Validators.min(1)]],
          price: [item.price, [Validators.required, Validators.min(0)]],
          total: [{ value: item.total, disabled: true }]
        });
        this.subscribeToItemChanges(itemGroup);
        this.items.push(itemGroup);
      });
    });
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  subscribeToItemChanges(itemForm: FormGroup): void {
    const quantityControl = itemForm.get('quantity');
    const priceControl = itemForm.get('price');

    quantityControl?.valueChanges.subscribe(() => {
      const total = (quantityControl.value || 0) * (priceControl?.value || 0);
      itemForm.get('total')?.setValue(total, { emitEvent: false });
    });

    priceControl?.valueChanges.subscribe(() => {
      const total = (quantityControl?.value || 0) * (priceControl.value || 0);
      itemForm.get('total')?.setValue(total, { emitEvent: false });
    });
  }

  addItem() {
    const itemForm = this.fb.group({
      itemName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      total: [{ value: 0, disabled: true }]
    });
    this.subscribeToItemChanges(itemForm);
    this.items.push(itemForm);
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  get invoiceTotal(): number {
    return this.items.controls.reduce((sum, control) => sum + (control.get('total')?.value || 0), 0);
  }

  submitInvoice() {
    if (!this.invoiceForm.valid) {
      this.statusMessage = 'Please fill all required fields.';
      return;
    }

    const formValue = this.invoiceForm.getRawValue();
    formValue.total = this.invoiceTotal;
    formValue.tax_amount = this.taxAmount;
    formValue.total = this.grandTotal;

    if (this.isEditMode && this.currentInvoiceId) {
      this.invoiceService.updateInvoice(this.currentInvoiceId, formValue).subscribe({
        next: () => {
          this.statusMessage = 'Invoice updated successfully!';
          alert('Invoice updated successfully!');
          setTimeout(() => this.router.navigate(['/invoices']), 2000);
        },
        error: (err: any) => this.statusMessage = `Error updating invoice: ${err.message}`
      });
    } else {
      this.invoiceService.createInvoice(formValue).subscribe({

        next: (response: any) => {
          console.log('SUCCESS: createInvoice returned a response:', response);
          this.generatedPdfPath = response.pdfPath;
          alert('Invoice created successfully!');
          this.invoiceCreationSuccess = true;
        },
        error: (err: any) =>{
          console.error('ERROR: createInvoice failed:', err);

          this.statusMessage = `Error creating invoice: ${err.message}`;
        
        }
      });
    }
  } // <-- The submitInvoice method ends here.

  sendEmail() {
    console.log('sendEmail() method called.');
    console.log('Customer Email:', this.invoiceForm.get('email')?.value);
    console.log('PDF Path from backend:', this.generatedPdfPath);
    this.statusMessage = 'Sending email...';
    const email = this.invoiceForm.get('email')?.value;

    if (!email || !this.generatedPdfPath) {
      this.statusMessage = 'Error: Customer email or PDF path is missing.';
      return;
    }

    this.invoiceService.sendInvoiceEmail(email, this.generatedPdfPath).subscribe({
      next: () => {
        this.statusMessage = 'Email sent successfully!';
      },
      error: (err: any) => {
        this.statusMessage = 'Failed to send email. Please try again.';
        console.error(err);
      }
    });
  }

  finish() {
    this.router.navigate(['/invoices']);
  }

} // <-- This is the FINAL closing brace for the entire class.