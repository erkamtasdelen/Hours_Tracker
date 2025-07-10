        let currentEmployeeData = null;
        let savedEmployees = [];
        let currentMonth = null;
        let currentYear = null;

        // Sayfa yüklendiğinde bu ayı ayarla
        document.addEventListener('DOMContentLoaded', function() {
            const today = new Date();
            const monthYear = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
            document.getElementById('monthYear').value = monthYear;
        });

        function startTimeEntry() {
            const employeeName = document.getElementById('employeeName').value.trim();
            const monthYear = document.getElementById('monthYear').value;
            
            if (!employeeName || !monthYear) {
                alert('Çalışan adı ve ay/yıl seçimi yapın!');
                return;
            }

            const [year, month] = monthYear.split('-').map(Number);
            currentMonth = month;
            currentYear = year;

            // Mevcut çalışanı kontrol et
            const existing = savedEmployees.find(emp => 
                emp.name === employeeName && emp.month === month && emp.year === year
            );

            if (existing) {
                currentEmployeeData = existing;
            } else {
                currentEmployeeData = {
                    name: employeeName,
                    month: month,
                    year: year,
                    days: {}
                };
            }

            document.getElementById('currentEmployee').textContent = employeeName;
            document.getElementById('currentMonth').textContent = getMonthName(month) + ' ' + year;

            createTimeGrid();
            document.getElementById('timeGridSection').classList.add('active');
            updateStats();
        }

        function createTimeGrid() {
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            const grid = document.getElementById('timeGrid');
            
            let html = `
                <div class="grid-header">Gün</div>
                <div class="grid-header">Başlangıç</div>
                <div class="grid-header">Bitiş</div>
                <div class="grid-header">Toplam</div>
                <div class="grid-header">Gün</div>
                <div class="grid-header">Başlangıç</div>
                <div class="grid-header">Bitiş</div>
                <div class="grid-header">Toplam</div>
            `;

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentYear, currentMonth - 1, day);
                const dayName = getDayName(date.getDay());
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const savedData = currentEmployeeData.days[day] || { start: '', end: '' };
                html += `
                    <div class="day-cell ${isWeekend ? 'weekend' : ''}">
                        ${day}<br><small>${dayName}</small>
                    </div>
                    <div class="time-inputs">
                        <input type="text" class="time-input" id="start_${day}" value="${savedData.start || ''}" placeholder="hh:mm" aoninput="formatTimeInput(this, ${day}, 'start')" onblur="formatTimeInput(this, ${day}, 'start', true)">
                    </div>
                    <div class="time-inputs">
                        <input type="text" class="time-input" id="end_${day}" value="${savedData.end || ''}" placeholder="hh:mm" aoninput="formatTimeInput(this, ${day}, 'end')" onblur="formatTimeInput(this, ${day}, 'end', true)">
                    </div>
                    <div class="total-hours" id="total_${day}">0h</div>
                `;
            }
            grid.innerHTML = html;
            // Saatleri hesapla
            for (let day = 1; day <= daysInMonth; day++) {
                calculateHours(day);
                // Enter/Tab ile sonraki inputa geçiş
                ['start', 'end'].forEach(type => {
                    const input = document.getElementById(`${type}_${day}`);
                    input.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            let nextId = type === 'start' ? `end_${day}` : `start_${day+1}`;
                            let nextInput = document.getElementById(nextId);
                            if (nextInput) nextInput.focus();
                        }
                    });
                });
            }
        }

        function formatTimeInput(input, day, type, forceFormat = false) {
            let val = input.value.replace(/[^0-9]/g, '');

            // En fazla 4 rakam al
            val = val.slice(0, 4);

            

            // Henüz 3 haneden azsa sadece yazılan rakamı bırak (erken biçimleme yok)
            if (!forceFormat && val.length < 4) {
                return;
            }

            // 4 haneyi saat ve dakika olarak böl
            let h = parseInt(val.slice(0, 2), 10);
            let m = parseInt(val.slice(2, 4), 10);


            if (val.length === 3) {
                h = val.slice(0, 1)
                m = val.slice(1, 3)
            }

            // Geçersiz girişleri düzelt
            if (isNaN(h)) h = 0;
            if (isNaN(m)) m = 0;
            if (h > 23) h = 23;
            if (m > 59) m = 59;

            // Dakikayı yukarıya doğru 15 dakikalık bloklara yuvarla
            m = Math.ceil(m / 15) * 15;
            if (m === 60) {
                m = 0;
                h += 1;
                if (h > 23) h = 23;
            }

            // Saat ve dakikayı biçimle
            let formatted = h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
            input.value = formatted;

            // Veriyi sakla
            if (!currentEmployeeData.days[day]) currentEmployeeData.days[day] = {};
            currentEmployeeData.days[day][type] = formatted;
            calculateHours(day);
        }



        function calculateHours(day) {
            const startInput = document.getElementById(`start_${day}`);
            const endInput = document.getElementById(`end_${day}`);
            const totalDiv = document.getElementById(`total_${day}`);
            const startTime = startInput.value;
            const endTime = endInput.value;
            if (!startTime || !endTime || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
                totalDiv.textContent = '0h';
                return;
            }
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            let totalMinutes = endMinutes - startMinutes;
            if (totalMinutes < 0) totalMinutes += 24 * 60; // Gece mesaisi
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            totalDiv.textContent = `${hours}h ${minutes > 0 ? minutes + 'm' : ''}`;
            // Veriyi kaydet
            if (!currentEmployeeData.days[day]) currentEmployeeData.days[day] = {};
            currentEmployeeData.days[day].start = startTime;
            currentEmployeeData.days[day].end = endTime;
            currentEmployeeData.days[day].total = totalMinutes / 60;
            updateStats();
        }

        function setCommonHours(startTime, endTime) {
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentYear, currentMonth - 1, day);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                // Gece vardiyası için özel kontrol
                if (startTime === '22:00' && endTime === '06:00') {
                    // Gece vardiyası için tüm günler
                    document.getElementById(`start_${day}`).value = startTime;
                    document.getElementById(`end_${day}`).value = endTime;
                    calculateHours(day);
                } else if (!isWeekend) {
                    // Diğer vardiyalar için sadece hafta içi
                    document.getElementById(`start_${day}`).value = startTime;
                    document.getElementById(`end_${day}`).value = endTime;
                    calculateHours(day);
                }
            }
        }

        function fillWeekdays() {
            setCommonHours('09:00', '17:00');
        }

        function clearAll() {
            const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                document.getElementById(`start_${day}`).value = '';
                document.getElementById(`end_${day}`).value = '';
                calculateHours(day);
            }
        }

        function copyPrevious() {
            // Önceki haftanın ilk 7 gününü sonraki 7 güne kopyala
            for (let day = 1; day <= 7; day++) {
                const startValue = document.getElementById(`start_${day}`).value;
                const endValue = document.getElementById(`end_${day}`).value;
                
                if (day + 7 <= new Date(currentYear, currentMonth, 0).getDate()) {
                    document.getElementById(`start_${day + 7}`).value = startValue;
                    document.getElementById(`end_${day + 7}`).value = endValue;
                    calculateHours(day + 7);
                }
            }
        }

        function updateStats() {
            if (!currentEmployeeData) return;
            
            let totalDays = 0;
            let totalHours = 0;
            let weekdayHours = 0;
            let weekendHours = 0;
            let nightHours = 0;
            let weekdayCount = 0;
            let weekendCount = 0;
            let nightShiftCount = 0;
            let dayShiftCount = 0;
            
            let longestDay = 0;
            let shortestDay = 24;
            let earliestStart = '23:59';
            let latestEnd = '00:00';
            let longestDayDate = '';
            let shortestDayDate = '';
            
            Object.entries(currentEmployeeData.days).forEach(([day, data]) => {
                if (data.start && data.end && data.total > 0) {
                    totalDays++;
                    totalHours += data.total;
                    
                    // Hafta içi/sonu kontrolü
                    const date = new Date(currentYear, currentMonth - 1, parseInt(day));
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    
                    if (isWeekend) {
                        weekendHours += data.total;
                        weekendCount++;
                    } else {
                        weekdayHours += data.total;
                        weekdayCount++;
                    }
                    
                    // Gece mesai kontrolü (22:00-06:00 arası başlayan)
                    const startHour = parseInt(data.start.split(':')[0]);
                    const endHour = parseInt(data.end.split(':')[0]);
                    
                    if (startHour >= 22 || startHour < 6 || endHour >= 22 || endHour < 6) {
                        nightHours += data.total;
                        nightShiftCount++;
                    } else {
                        dayShiftCount++;
                    }
                    
                    // En uzun/kısa gün
                    if (data.total > longestDay) {
                        longestDay = data.total;
                        longestDayDate = `${day}.${currentMonth}`;
                    }
                    if (data.total < shortestDay) {
                        shortestDay = data.total;
                        shortestDayDate = `${day}.${currentMonth}`;
                    }
                    
                    // En erken/geç saatler
                    if (data.start < earliestStart) {
                        earliestStart = data.start;
                    }
                    if (data.end > latestEnd) {
                        latestEnd = data.end;
                    }
                }
            });
            
            // Ana istatistikler
            document.getElementById('totalDays').textContent = totalDays;
            document.getElementById('totalHours').textContent = totalHours.toFixed(1);
            document.getElementById('avgHours').textContent = totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0';
            document.getElementById('weekdayHours').textContent = weekdayHours.toFixed(1);
            document.getElementById('weekendHours').textContent = weekendHours.toFixed(1);
            document.getElementById('nightHours').textContent = nightHours.toFixed(1);
            
            // Detaylı istatistikler
            document.getElementById('longestDay').textContent = totalDays > 0 ? `${longestDay.toFixed(1)}h (${longestDayDate})` : '-';
            document.getElementById('shortestDay').textContent = totalDays > 0 ? `${shortestDay.toFixed(1)}h (${shortestDayDate})` : '-';
            document.getElementById('earliestStart').textContent = totalDays > 0 ? earliestStart : '-';
            document.getElementById('latestEnd').textContent = totalDays > 0 ? latestEnd : '-';
            document.getElementById('weekdayCount').textContent = `${weekdayCount} gün`;
            document.getElementById('weekendCount').textContent = `${weekendCount} gün`;
            document.getElementById('nightShiftCount').textContent = `${nightShiftCount} gün`;
            document.getElementById('dayShiftCount').textContent = `${dayShiftCount} gün`;
        }

        function saveEmployee() {
            if (!currentEmployeeData) return;
            
            const existingIndex = savedEmployees.findIndex(emp => 
                emp.name === currentEmployeeData.name && 
                emp.month === currentEmployeeData.month && 
                emp.year === currentEmployeeData.year
            );
            
            if (existingIndex >= 0) {
                savedEmployees[existingIndex] = currentEmployeeData;
            } else {
                savedEmployees.push(currentEmployeeData);
            }
            
            updateEmployeeList();
            showNotification('Çalışan kaydedildi!');
        }

        function updateEmployeeList() {
            const listDiv = document.getElementById('employeeList');
            
            if (savedEmployees.length === 0) {
                listDiv.innerHTML = '<div style="text-align: center; padding: 20px; color: #7f8c8d;">Henüz kayıtlı çalışan bulunmuyor</div>';
                return;
            }
            
            listDiv.innerHTML = savedEmployees.map(emp => {
                const totalHours = Object.values(emp.days).reduce((sum, day) => sum + (day.total || 0), 0);
                return `
                    <div class="employee-item">
                        <div>
                            <div class="employee-name">${emp.name}</div>
                            <small>${getMonthName(emp.month)} ${emp.year}</small>
                        </div>
                        <div class="employee-hours">${totalHours.toFixed(1)} saat</div>
                        <button class="btn-edit" onclick="editEmployee('${emp.name}', ${emp.month}, ${emp.year})">Düzenle</button>
                    </div>
                `;
            }).join('');
        }

        function editEmployee(name, month, year) {
            document.getElementById('employeeName').value = name;
            document.getElementById('monthYear').value = `${year}-${month.toString().padStart(2, '0')}`;
            startTimeEntry();
        }

        function exportToExcel() {
            if (savedEmployees.length === 0) {
                alert('Önce çalışan kaydetmeniz gerekiyor!');
                return;
            }
            savedEmployees.forEach(emp => {
                let csvContent = '';
                // 1. satır: çalışan adı
                csvContent += `${emp.name}\n`;
                // 2. satır: başlıklar
                csvContent += 'Datum,Begin,Eind,Totaal,Subtotaal\n';
                let weekTotal = 0;
                let weekStartDay = 1;
                let monthTotal = 0;
                const daysInMonth = new Date(emp.year, emp.month, 0).getDate();
                const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(emp.year, emp.month - 1, day);
                    const dayName = date.getDay(); // 0: Pazar
                    const data = emp.days[day] || { start: '', end: '', total: 0 };
                    // Tarih formatı: 02 Temmuz 2025 Cuma
                    const datum = `${day.toString().padStart(2, '0')} ${aylar[emp.month-1]} ${emp.year} ${gunler[dayName]}`;
                    const begin = data.start || '';
                    const eind = data.end || '';
                    const totaal = data.total ? data.total.toFixed(2) : '';
                    weekTotal += data.total || 0;
                    monthTotal += data.total || 0;
                    let subtotaal = '';
                    // Eğer Pazar günü veya son gün ise, haftalık toplamı yaz
                    if (dayName === 0 || day === daysInMonth) {
                        subtotaal = weekTotal > 0 ? weekTotal.toFixed(2) : '';
                    }
                    csvContent += `${datum},${begin},${eind},${totaal},${subtotaal}\n`;
                    // Pazar günü ise haftalık toplamı sıfırla
                    if (dayName === 0 || day === daysInMonth) {
                        weekTotal = 0;
                        weekStartDay = day + 1;
                    }
                }
                // En altta tüm ayın toplamı
                csvContent += `,,,,${monthTotal > 0 ? monthTotal.toFixed(2) : ''}\n`;
                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${emp.name}_aylik_saatler_${emp.month}_${emp.year}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
            showNotification('Excel dosyası indirildi!');
        }

        function getDayName(dayIndex) {
            const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
            return days[dayIndex];
        }

        function getMonthName(monthIndex) {
            const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                          'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            return months[monthIndex - 1];
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2ecc71;
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                z-index: 1000;
                animation: slideIn 0.3s ease;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // CSS animasyonu
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);   