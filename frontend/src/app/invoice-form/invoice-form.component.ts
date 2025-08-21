



import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router'; // Import ActivatedRoute and Router
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
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Check the URL for an 'id' parameter to determine if we are in edit mode
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.currentInvoiceId = +id; // Convert string to number
        this.loadInvoiceForEdit(this.currentInvoiceId);
      } else {
        // If no ID, we are in create mode, so add one empty item row
        this.isEditMode = false;
        this.addItem();
      }
    });
  }

  // Fetch invoice data from the server and populate the form
  loadInvoiceForEdit(id: number): void {
    this.invoiceService.getInvoiceById(id).subscribe(data => {
      this.invoiceForm.patchValue(data);
      // Clear existing items and populate with fetched items
      this.items.clear();
      data.items.forEach((item: any) => {
        this.items.push(this.fb.group({
          itemName: [item.itemName, Validators.required],
          quantity: [item.quantity, [Validators.required, Validators.min(1)]],
          price: [item.price, [Validators.required, Validators.min(0)]],
          total: [{ value: item.total, disabled: true }]
        }));
      });
    });
  }

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  addItem() {
    const itemForm = this.fb.group({
      itemName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      total: [{ value: 0, disabled: true }]
    });
    // Add logic to auto-calculate total for new rows
    itemForm.valueChanges.subscribe(val => {
        const total = (val.quantity || 0) * (val.price || 0);
        itemForm.get('total')?.setValue(total, { emitEvent: false });
    });
    this.items.push(itemForm);
  }

  removeItem(index: number) {
    this.items.removeAt(index);
  }

  get invoiceTotal(): number {
    return this.items.controls.reduce((sum, control) => sum + (control.get('total')?.value || 0), 0);
  }

  // This function now handles BOTH creating and updating
  submitInvoice() {
    if (!this.invoiceForm.valid) {
      alert('Please fill all required fields.');
      return;
    }

    const formValue = this.invoiceForm.getRawValue();
    formValue.total = this.invoiceTotal;

    if (this.isEditMode && this.currentInvoiceId) {
      // UPDATE existing invoice
      this.invoiceService.updateInvoice(this.currentInvoiceId, formValue).subscribe({
        next: () => {
          alert('Invoice updated successfully!');
          this.router.navigate(['/invoices']);
        },
        error: (err:any) => alert(`Error updating invoice: ${err.message}`)
      });
    } else {
      // CREATE new invoice
      this.invoiceService.createInvoice(formValue).subscribe({
        next: () => {
          alert('Invoice created successfully!');
          this.router.navigate(['/invoices']);
        },
        error: (err) => alert(`Error creating invoice: ${err.message}`)
      });
    }
  }
}