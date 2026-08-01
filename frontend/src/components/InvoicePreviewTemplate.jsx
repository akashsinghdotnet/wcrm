import React from 'react';

export default function InvoicePreviewTemplate({ form, user, invoice }) {
    const template = form?.template || 'template1';
    
    const companyName = form?.companyName || user?.company?.companyName || 'Your Company Name';
    const invoicePrefix = form?.prefix || 'INV-';

    // If a real invoice is provided, use its data. Otherwise, use generic mock data.
    const isMock = !invoice;
    
    const clientName = isMock ? "John Doe" : (invoice.client?.name || invoice.guestClientName || invoice.company?.companyName || 'Walk-in Customer');
    const clientAddress = isMock ? "123 Customer Street, City\nState, Country - 100001" : (invoice.guestClientAddress || invoice.client?.address || invoice.company?.address || '');
    const clientPhone = isMock ? "+91 9876543210" : (invoice.client?.phone || invoice.guestClientPhone || invoice.company?.phone || '');
    const clientEmail = isMock ? "customer@example.com" : (invoice.client?.email || invoice.guestClientEmail || invoice.company?.email || '');
    const clientGst = isMock ? "" : (invoice.clientGst || invoice.client?.gstNo || invoice.company?.gstNo || '');

    const displayInvoiceNumber = isMock ? `${invoicePrefix}0001` : (invoice.invoiceNumber || 'Draft');
    const displayDate = isMock ? new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(invoice.invoiceDate || invoice.createdAt || invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const displayStatus = isMock ? 'PAID' : (invoice.status?.toUpperCase() || 'PENDING');

    const items = isMock ? [
        { desc: "Sample Product / Service", qty: 1, rate: 1000, hsn: "998315", total: 1000 },
        { desc: "Additional Service", qty: 2, rate: 500, hsn: "998315", total: 1000 }
    ] : (invoice.items || []).map(item => ({
        desc: item.description || item.name,
        qty: Number(item.quantity || 1),
        rate: Number(item.rate || item.price || 0),
        hsn: item.hsn || '',
        total: Number(item.quantity || 1) * Number(item.rate || item.price || 0)
    }));

    // For Subscription invoices which might not have an items array in the same format
    if (!isMock && (!invoice.items || invoice.items.length === 0) && invoice.description) {
        items.push({
            desc: invoice.description,
            qty: 1,
            rate: Number(invoice.amount || 0),
            hsn: '',
            total: Number(invoice.amount || 0)
        });
    }

    const subtotal = isMock ? 2000 : Number(invoice.subtotal !== undefined ? invoice.subtotal : invoice.amount);
    const tax = isMock ? 360 : Number(invoice.tax !== undefined ? invoice.tax : (invoice.amount * 0.18)); 
    const total = isMock ? 2360 : Number(invoice.total || invoice.amount || (subtotal + tax));

    const renderTemplate1 = () => (
        <div className="w-full bg-white text-black font-sans text-[12px] leading-tight pb-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-6 px-8 pt-8">
                <div className="flex gap-4 items-center">
                    {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo" className="h-16 object-contain bg-black p-2" />
                    ) : (
                        <div className="bg-black text-white px-6 py-4 font-serif text-2xl font-bold flex items-center justify-center">
                            {companyName.substring(0, 5).toLowerCase()}
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold mb-1">{companyName}</h2>
                        {form.address && <div className="text-[11px] text-gray-800 whitespace-pre-wrap">{form.address}</div>}
                    </div>
                </div>
                <div className="text-right text-[11px] font-semibold space-y-1">
                    <p>Phone : {form.phone || '9116920091'}</p>
                    <p>Email : {form.email || user?.email || 'email@example.com'}</p>
                    {form.website && <p>Website : {form.website}</p>}
                </div>
            </div>

            {/* Blue line + INVOICE */}
            <div className="border-t-[3px] border-b-[3px] border-[#4472c4] py-1 mb-4 flex items-center px-8 bg-blue-50/10">
                <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-[#4472c4] tracking-wide">INVOICE</span>
                </div>
                <div className="text-right text-[10px] font-bold w-48">ORIGINAL FOR RECIPIENT</div>
            </div>

            {/* Details Grid */}
            <div className="flex border border-[#4472c4] mb-4 mx-8">
                <div className="flex-1 border-r border-[#4472c4]">
                    <div className="border-b border-[#4472c4] bg-[#e6f0ff] text-center py-1 font-bold text-[11px]">Customer Detail</div>
                    <div className="p-2 space-y-1.5 text-[11px]">
                        <div className="flex"><span className="w-20 font-bold">Name</span> <span>{clientName}</span></div>
                        <div className="flex"><span className="w-20 font-bold">Address</span> <span className="flex-1 whitespace-pre-wrap">{clientAddress}</span></div>
                        {clientPhone && <div className="flex"><span className="w-20 font-bold">Phone</span> <span>{clientPhone}</span></div>}
                        {clientEmail && <div className="flex"><span className="w-20 font-bold">Email</span> <span>{clientEmail}</span></div>}
                        {clientGst && <div className="flex"><span className="w-20 font-bold">GSTIN</span> <span>{clientGst}</span></div>}
                    </div>
                </div>
                <div className="w-64 border-[#4472c4]">
                    <div className="flex p-2 gap-4">
                        <div className="flex-1 space-y-2">
                            <div><span className="font-bold">Invoice No.</span></div>
                            <div className="text-center font-bold text-sm">{displayInvoiceNumber}</div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div><span className="font-bold">Invoice Date</span></div>
                            <div className="text-center text-sm">{displayDate}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="mx-8 border border-[#4472c4] flex flex-col mb-4 min-h-[250px]">
                <table className="w-full text-center border-collapse">
                    <thead className="bg-[#e6f0ff] font-bold text-[10px]">
                        <tr>
                            <th className="py-2 px-1 border-r border-b border-[#4472c4] w-10">Sr.<br/>No.</th>
                            <th className="py-2 px-2 border-r border-b border-[#4472c4] text-center">Name of Product / Service</th>
                            <th className="py-2 px-2 border-r border-b border-[#4472c4] w-20">HSN / SAC</th>
                            <th className="py-2 px-2 border-r border-b border-[#4472c4] w-16">Qty</th>
                            <th className="py-2 px-2 border-r border-b border-[#4472c4] w-24">Rate</th>
                            <th className="py-2 px-2 border-b border-[#4472c4] w-24">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx}>
                                <td className="py-2 border-r border-[#4472c4]">{idx + 1}</td>
                                <td className="py-2 px-2 border-r border-[#4472c4] text-left font-bold">{item.desc}</td>
                                <td className="py-2 px-2 border-r border-[#4472c4]">{item.hsn}</td>
                                <td className="py-2 px-2 border-r border-[#4472c4]">{item.qty.toFixed(2)}</td>
                                <td className="py-2 px-2 border-r border-[#4472c4] text-right">{item.rate.toFixed(2)}</td>
                                <td className="py-2 px-2 text-right">{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-auto border-t border-[#4472c4] flex font-bold bg-[#e6f0ff]">
                    <div className="flex-1 text-center py-2 px-2 border-r border-[#4472c4]">Total</div>
                    <div className="w-16 text-center py-2 border-r border-[#4472c4]">{items.reduce((acc, item) => acc + item.qty, 0)}</div>
                    <div className="w-48 text-right py-2 px-2">{subtotal.toFixed(2)}</div>
                </div>
            </div>

            {/* Totals & Bank Box */}
            <div className="flex border border-[#4472c4] mx-8">
                {/* Left Side (Words & Bank & Terms) */}
                <div className="flex-1 border-r border-[#4472c4] flex flex-col">
                    {/* Hiding 'Total in words' to keep it simple for real invoices unless implemented */}
                    
                    <div className="border-b border-[#4472c4] text-center py-1.5 font-bold bg-[#e6f0ff]">Bank Details</div>
                    <div className="p-3 flex justify-between items-start border-b border-[#4472c4]">
                        <div className="space-y-1.5 text-[11px]">
                            <div className="flex"><span className="w-20">Name</span> <span>{form.bankName || 'Punjab National Bank'}</span></div>
                            <div className="flex"><span className="w-20">Branch</span> <span>{form.bankBranch || 'Main Branch'}</span></div>
                            <div className="flex"><span className="w-20">Acc. Name</span> <span>{form.accountHolderName || 'Your Name'}</span></div>
                            <div className="flex"><span className="w-20">Acc. Number</span> <span>{form.accountNumber || '9030001500003212'}</span></div>
                            <div className="flex"><span className="w-20">IFSC</span> <span>{form.ifscCode || 'PUNB0903000'}</span></div>
                            <div className="flex"><span className="w-20">UPI ID</span> <span>{form.upiId || '7689938526@ybl'}</span></div>
                        </div>
                        {form.upiQrUrl && (
                            <div className="text-center">
                                <img src={form.upiQrUrl} alt="QR" className="w-24 h-24 border p-1 object-contain" />
                                <div className="font-bold text-[10px] mt-1">Pay using UPI</div>
                            </div>
                        )}
                    </div>
                    
                    <div className="border-b border-[#4472c4] text-center py-1.5 font-bold bg-[#e6f0ff]">Terms and Conditions</div>
                    <div className="p-3 text-[10px] whitespace-pre-wrap">{form.terms || 'All services are subject to our standard agreement.'}</div>
                </div>
                {/* Right Side (Total Amount & Signature) */}
                <div className="w-64 flex flex-col">
                    {tax > 0 && (
                        <div className="flex border-b border-[#4472c4] bg-white">
                            <div className="flex-1 p-2 font-bold border-r border-[#4472c4]">Tax</div>
                            <div className="p-2 text-right font-bold text-sm">₹{tax.toFixed(2)}</div>
                        </div>
                    )}
                    <div className="flex border-b border-[#4472c4] bg-[#e6f0ff]">
                        <div className="flex-1 p-2 font-bold border-r border-[#4472c4]">Total Amount</div>
                        <div className="p-2 text-right font-bold text-sm">₹{total.toFixed(2)}</div>
                    </div>
                    <div className="text-right text-[9px] p-1 border-b border-[#4472c4] font-bold">(E & O.E.)</div>
                    
                    <div className="flex-1 flex flex-col p-2 text-center items-center">
                        <div className="text-[9px] font-bold mb-4">Certified that the particulars given above are true and correct.</div>
                        <div className="font-bold text-sm mb-4">For {companyName}</div>
                        <div className="mt-auto w-full">
                            {form.signatureUrl && <img src={form.signatureUrl} alt="Signature" className="h-16 object-contain mx-auto mb-2" />}
                            <div className="text-[10px] border-t border-black pt-1 font-bold">Authorised Signatory</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTemplate2 = () => (
        <div className="w-full bg-white text-[#333] flex flex-col font-sans p-10 text-[12px] leading-relaxed pb-8">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-2xl font-bold text-black mb-2">Tax Invoice</h1>
                    <p className="text-gray-700 font-bold text-sm">{displayInvoiceNumber}</p>
                </div>
                <div className="text-right">
                    {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo" className="h-16 object-contain inline-block" />
                    ) : (
                        <div className="h-16 w-16 bg-[#3b2c70] text-white flex items-center justify-center font-bold text-3xl rounded-full ml-auto">S</div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-start mb-8">
                <div className="bg-[#f3f4fb] p-5 w-[45%]">
                    <p className="text-[#6366f1] text-sm mb-3">Bill to:</p>
                    <p className="font-bold text-black text-sm mb-1">{clientName}</p>
                    <p className="mb-3 text-gray-700 whitespace-pre-wrap leading-snug">{clientAddress}</p>
                    {clientEmail && <p className="text-gray-700 font-medium">{clientEmail}</p>}
                    {clientPhone && <p className="text-gray-700 font-medium">{clientPhone}</p>}
                    {clientGst && <p className="text-gray-700 font-medium">GSTIN: {clientGst}</p>}
                </div>
                <div className="text-right w-[45%] text-[11px] space-y-1">
                    <h2 className="font-bold text-black text-sm uppercase mb-2">{companyName}</h2>
                    {form.gstNo && <p className="text-gray-600">Tax #: IGST / CGST / SGST</p>}
                    <p className="text-gray-600">{form.email || user?.email || 'info@company.com'}</p>
                    {form.phone && <p className="text-gray-600">{form.phone}</p>}
                    {form.website && <p className="text-gray-600">{form.website}</p>}
                    {form.address && <p className="text-gray-600 whitespace-pre-wrap leading-snug">{form.address}</p>}
                    {form.gstNo && <p className="text-gray-600 mt-2">GSTIN : {form.gstNo}</p>}
                </div>
            </div>

            <div className="bg-[#f8f9fa] p-4 mb-8 text-[11px] rounded flex flex-col gap-1 w-2/3">
                <p><span className="text-gray-600 w-20 inline-block">Issued:</span> <span className="font-bold text-black">{displayDate}</span></p>
                <p><span className="text-gray-600 w-20 inline-block">Status:</span> <span className={`font-bold ${displayStatus === 'PAID' ? 'text-[#16a34a]' : 'text-amber-500'}`}>{displayStatus}</span></p>
                <p><span className="text-gray-600 w-20 inline-block">Currency:</span> <span className="font-bold text-black">INR</span></p>
            </div>

            <div className="flex-1">
                <table className="w-full text-left mb-8">
                    <thead className="bg-[#b4bdf8] text-white">
                        <tr>
                            <th className="py-2.5 px-4 font-semibold">Items</th>
                            <th className="py-2.5 px-4 text-center font-semibold w-32">Price (INR)</th>
                            <th className="py-2.5 px-4 text-center font-semibold w-24">Qty</th>
                            <th className="py-2.5 px-4 text-right font-semibold w-32">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                                <td className="py-4 px-4 font-bold text-black">{item.desc}</td>
                                <td className="py-4 px-4 text-center">{item.rate.toFixed(2)}</td>
                                <td className="py-4 px-4 text-center">{item.qty}</td>
                                <td className="py-4 px-4 text-right font-bold text-black">{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mb-12">
                    <div className="w-[300px]">
                        <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-700">Subtotal</span>
                            <span className="font-bold text-black">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                            <span className="text-gray-700">IGST</span>
                            <span className="font-bold text-black">₹{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between py-3 bg-[#b4bdf8] px-4 rounded-sm mt-3 text-white font-bold text-sm">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* E-Invoice / Bank Info */}
                <div className="border border-gray-200 rounded p-6 bg-[#fafafa]">
                    <h3 className="text-center font-bold text-xl text-black mb-6">E-Invoice Information</h3>
                    <div className="flex justify-between items-center text-[11px]">
                        <div className="space-y-2">
                            {form.bankName && <p><span className="text-gray-500 w-12 inline-block">Bank:</span> <span className="font-medium">{form.bankName}</span></p>}
                            {form.accountNumber && <p><span className="text-gray-500 w-12 inline-block">A/C:</span> <span className="font-medium">{form.accountNumber}</span></p>}
                            {form.ifscCode && <p><span className="text-gray-500 w-12 inline-block">IFSC:</span> <span className="font-medium">{form.ifscCode}</span></p>}
                            {form.upiId && <p><span className="text-gray-500 w-12 inline-block">UPI:</span> <span className="font-medium">{form.upiId}</span></p>}
                        </div>
                        {form.upiQrUrl && (
                            <div className="flex flex-col items-center">
                                <img src={form.upiQrUrl} alt="QR Code" className="w-24 h-24 object-contain mix-blend-multiply border p-1" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="mt-12 text-gray-500 text-[11px] flex justify-between">
                <span>This is a computer-generated invoice. No signature required.</span>
                <span>Page 1</span>
            </div>
        </div>
    );

    const renderTemplate3 = () => (
        <div className="w-full bg-white text-black flex flex-col font-sans border-l border-r border-b border-gray-300 text-[11px] leading-tight pb-8">
            {/* Header Box */}
            <div className="flex justify-between border-b border-gray-300">
                <div className="bg-[#1c1236] text-white p-6 w-[60%] flex gap-4">
                    {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo" className="w-20 h-20 object-contain p-1" />
                    ) : (
                        <div className="w-20 h-20 border-2 border-white flex items-center justify-center font-bold text-2xl">LOGO</div>
                    )}
                    <div className="mt-1 space-y-1">
                        <h2 className="font-bold text-[16px] mb-2 uppercase tracking-wide">{companyName}</h2>
                        {form.address && <p className="text-gray-200 text-[10px] whitespace-pre-wrap leading-snug">{form.address}</p>}
                        {form.gstNo && <p className="text-gray-200 text-[10px]">GSTIN {form.gstNo}</p>}
                        <p className="text-gray-200 text-[10px]">{form.phone || '9999999999'}</p>
                        <p className="text-gray-200 text-[10px]">{form.email || user?.email || 'sales@company.com'}</p>
                        {form.website && <p className="text-gray-200 text-[10px]">{form.website}</p>}
                    </div>
                </div>
                <div className="w-[40%] flex items-end justify-end p-6">
                    <h1 className="text-3xl font-light text-black tracking-wide">TAX INVOICE</h1>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 border-b border-gray-300">
                <div className="p-3 border-r border-gray-300 space-y-1">
                    <div className="flex"><span className="w-24">#</span> <span className="font-bold">: {displayInvoiceNumber}</span></div>
                    <div className="flex"><span className="w-24">Invoice Date</span> <span className="font-bold">: {displayDate}</span></div>
                </div>
                <div className="p-3 space-y-1">
                    <div className="flex"><span className="w-28">Status</span> <span className="font-bold">: {displayStatus}</span></div>
                </div>
            </div>

            {/* Bill To */}
            <div className="border-b border-gray-300 bg-gray-100 p-2 font-bold px-4">Bill To</div>
            <div className="border-b border-gray-300 p-4 text-sm bg-white">
                <div className="font-bold mb-1">{clientName}</div>
                <div className="text-gray-600 text-xs whitespace-pre-wrap">{clientAddress}</div>
                {clientEmail && <div className="text-gray-600 text-xs">{clientEmail}</div>}
                {clientPhone && <div className="text-gray-600 text-xs">{clientPhone}</div>}
                {clientGst && <div className="text-gray-600 text-xs">GSTIN: {clientGst}</div>}
            </div>

            {/* Table */}
            <table className="w-full text-center border-b border-gray-300 border-collapse">
                <thead className="bg-gray-100 font-bold text-black border-b border-gray-300 text-[10px]">
                    <tr>
                        <th rowSpan="2" className="py-2 px-2 border-r border-gray-300 w-10">#</th>
                        <th rowSpan="2" className="py-2 px-2 border-r border-gray-300 text-left">Item & Description</th>
                        <th rowSpan="2" className="py-2 px-2 border-r border-gray-300 w-12">Qty</th>
                        <th rowSpan="2" className="py-2 px-2 border-r border-gray-300 w-24">Rate</th>
                        <th colSpan="2" className="py-1 px-2 border-r border-gray-300 border-b">IGST</th>
                        <th rowSpan="2" className="py-2 px-2 w-28">Amount</th>
                    </tr>
                    <tr>
                        <th className="py-1 px-1 border-r border-gray-300 w-12">%</th>
                        <th className="py-1 px-1 border-r border-gray-300 w-20">Amt</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-300">
                            <td className="py-3 border-r border-gray-300">{idx + 1}</td>
                            <td className="py-3 px-2 border-r border-gray-300 text-left">{item.desc}</td>
                            <td className="py-3 px-2 border-r border-gray-300">{item.qty}</td>
                            <td className="py-3 px-2 border-r border-gray-300 text-right">{item.rate.toFixed(2)}</td>
                            <td className="py-3 px-1 border-r border-gray-300 text-right">18%</td>
                            <td className="py-3 px-2 border-r border-gray-300 text-right">{(item.rate * 0.18).toFixed(2)}</td>
                            <td className="py-3 px-2 text-right bg-gray-50">{item.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Bottom Section */}
            <div className="flex bg-white">
                {/* Left side (Notes & Bank) */}
                <div className="flex-1 p-4 border-r border-gray-300 flex flex-col">
                    <div className="mb-6">
                        <p className="text-gray-600 text-[10px] mb-1">Notes</p>
                        <p className="whitespace-pre-wrap leading-snug">{form.terms}</p>
                    </div>

                    <div className="mt-auto space-y-1">
                        <p><span className="font-bold">Bank Name</span> - {form.bankName}</p>
                        <p><span className="font-bold">Branch</span> - {form.bankBranch || 'Main Branch'}</p>
                        <p><span className="font-bold">Acc. Name</span> - {form.accountHolderName}</p>
                        <p><span className="font-bold">Acc. Number</span> - {form.accountNumber}</p>
                        <p><span className="font-bold">IFSC</span> - {form.ifscCode}</p>
                        {form.upiQrUrl && <img src={form.upiQrUrl} alt="QR" className="w-20 h-20 mt-4 border border-gray-300 object-contain p-1" />}
                    </div>
                </div>
                
                {/* Right side (Totals & Signature) */}
                <div className="w-72 flex flex-col">
                    <div className="p-4 border-b border-gray-300 space-y-2">
                        <div className="flex justify-between text-gray-700">
                            <span>Sub Total</span>
                            <span>{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-700">
                            <span>IGST18 (18%)</span>
                            <span>{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm mt-2">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm mt-2">
                            <span>Balance Due</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-4 flex flex-col items-center justify-end text-center">
                        <p className="font-bold text-[#3b2c70] text-sm mb-2">For {companyName}</p>
                        {form.signatureUrl ? (
                            <img src={form.signatureUrl} alt="Signature" className="h-16 object-contain mix-blend-multiply my-4" />
                        ) : (
                            <div className="h-16 border-b border-gray-400 w-40 my-4"></div>
                        )}
                        <p className="font-bold text-blue-600 text-sm">Director</p>
                        <p className="text-[10px] text-gray-600 mt-4 border-t border-gray-300 w-full pt-1">Authorized Signature</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full bg-gray-200 border border-gray-300 rounded-xl overflow-y-auto max-h-[80vh] custom-scrollbar shadow-inner">
            <div className="w-full max-w-[800px] mx-auto bg-white shadow-2xl">
                {template === 'template1' && renderTemplate1()}
                {template === 'template2' && renderTemplate2()}
                {template === 'template3' && renderTemplate3()}
            </div>
        </div>
    );
}
