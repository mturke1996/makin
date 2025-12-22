import html2canvas from 'html2canvas';
import type { Client, Expense } from '../types';
import { formatCurrency } from './calculations';
import dayjs from 'dayjs';

export const generateWhatsAppStatement = async (
  client: Client,
  expenses: Expense[],
  totalExpenses: number,
  totalPaid: number,
  remainingDebt: number
) => {
  // إنشاء div مخفي للتصدير
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 400px;
    background: white;
    padding: 20px;
    font-family: 'Cairo', sans-serif;
  `;

  container.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 15px;
      margin-bottom: 15px;
      text-align: center;
    ">
      <div style="font-size: 28px; font-weight: 900; margin-bottom: 8px;">
        كشف حساب
      </div>
      <div style="font-size: 14px; opacity: 0.95;">
        ${dayjs().format('DD MMMM YYYY')}
      </div>
    </div>

    <div style="
      background: #f8fafc;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 15px;
    ">
      <div style="font-size: 18px; font-weight: 700; margin-bottom: 10px; color: #1e293b;">
        ${client.name}
      </div>
      <div style="font-size: 13px; color: #64748b; margin-bottom: 5px;">
        📱 ${client.phone}
      </div>
      <div style="font-size: 13px; color: #64748b;">
        📍 ${client.address}
      </div>
    </div>

    <div style="
      background: #eff6ff;
      padding: 15px;
      border-radius: 12px;
      margin-bottom: 15px;
      border-right: 4px solid #3b82f6;
    ">
      <div style="font-size: 14px; font-weight: 700; color: #1e40af; margin-bottom: 12px;">
        📊 ملخص الحساب
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #64748b; font-size: 13px;">إجمالي المصروفات:</span>
        <span style="font-weight: 700; color: #1e293b; font-size: 14px;">
          ${formatCurrency(totalExpenses)}
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="color: #64748b; font-size: 13px;">المدفوع:</span>
        <span style="font-weight: 700; color: #10b981; font-size: 14px;">
          ${formatCurrency(totalPaid)}
        </span>
      </div>
      <div style="
        display: flex;
        justify-content: space-between;
        padding-top: 10px;
        border-top: 2px solid #dbeafe;
        margin-top: 10px;
      ">
        <span style="font-weight: 700; font-size: 16px; color: #1e40af;">المتبقي:</span>
        <span style="font-weight: 900; font-size: 18px; color: #ef4444;">
          ${formatCurrency(remainingDebt)}
        </span>
      </div>
    </div>

    ${expenses.length > 0 ? `
    <div style="
      background: #fef3c7;
      padding: 15px;
      border-radius: 12px;
      border-right: 4px solid #f59e0b;
    ">
      <div style="font-size: 14px; font-weight: 700; color: #92400e; margin-bottom: 12px;">
        📝 آخر المصروفات (${expenses.length})
      </div>
      ${expenses.slice(0, 5).map(exp => `
        <div style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #fde68a;
        ">
          <div>
            <div style="font-size: 13px; font-weight: 600; color: #1e293b;">
              ${exp.description}
            </div>
            <div style="font-size: 11px; color: #64748b;">
              ${dayjs(exp.date).format('DD/MM/YYYY')} • ${exp.category}
            </div>
          </div>
          <div style="font-weight: 700; color: #f59e0b; font-size: 14px;">
            ${formatCurrency(exp.amount)}
          </div>
        </div>
      `).join('')}
      ${expenses.length > 5 ? `
        <div style="text-align: center; color: #92400e; font-size: 12px; margin-top: 10px;">
          + ${expenses.length - 5} مصروف آخر
        </div>
      ` : ''}
    </div>
    ` : ''}

    <div style="
      text-align: center;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      color: #64748b;
      font-size: 11px;
    ">
      <div style="font-weight: 700; margin-bottom: 3px;">DebtFlow Pro</div>
      <div>نظام إدارة الديون والمصروفات</div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });

    document.body.removeChild(container);

    // تحويل إلى صورة
    const image = canvas.toDataURL('image/png');
    
    // فتح الصورة في نافذة جديدة
    const newWindow = window.open('');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>كشف حساب - ${client.name}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: #f1f5f9;
              font-family: 'Cairo', sans-serif;
            }
            img {
              max-width: 100%;
              border-radius: 15px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .buttons {
              margin-top: 20px;
              display: flex;
              gap: 10px;
            }
            button {
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-family: 'Cairo', sans-serif;
              font-weight: 700;
              font-size: 14px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .download {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
            }
            .share {
              background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
              color: white;
            }
            button:active {
              transform: scale(0.95);
            }
          </style>
        </head>
        <body>
          <img src="${image}" alt="كشف حساب">
          <div class="buttons">
            <button class="download" onclick="downloadImage()">💾 تحميل</button>
            <button class="share" onclick="shareImage()">📱 مشاركة</button>
          </div>
          <script>
            function downloadImage() {
              const link = document.createElement('a');
              link.download = 'كشف-حساب-${client.name}-${dayjs().format('DD-MM-YYYY')}.png';
              link.href = '${image}';
              link.click();
            }
            
            async function shareImage() {
              try {
                const response = await fetch('${image}');
                const blob = await response.blob();
                const file = new File([blob], 'كشف-حساب.png', { type: 'image/png' });
                
                if (navigator.share && navigator.canShare({ files: [file] })) {
                  await navigator.share({
                    title: 'كشف حساب - ${client.name}',
                    text: 'كشف حساب العميل',
                    files: [file]
                  });
                } else {
                  alert('المشاركة غير متاحة. يرجى تحميل الصورة ومشاركتها يدوياً.');
                  downloadImage();
                }
              } catch (error) {
                console.error('Error sharing:', error);
                alert('حدث خطأ. يرجى تحميل الصورة ومشاركتها يدوياً.');
                downloadImage();
              }
            }
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();
    }

    return image;
  } catch (error) {
    document.body.removeChild(container);
    console.error('Error generating statement:', error);
    throw error;
  }
};

