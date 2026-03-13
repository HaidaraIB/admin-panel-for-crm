
import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../context/i18n';

interface Country {
  code: string;
  name: string;
  nameAr: string;
  dialCode: string;
  flag: string;
}

const countries: Country[] = [
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', dialCode: '+963', flag: '🇸🇾' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', dialCode: '+964', flag: '🇮🇶' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', dialCode: '+971', flag: '🇦🇪' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', dialCode: '+965', flag: '🇰🇼' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', dialCode: '+974', flag: '🇶🇦' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', dialCode: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', nameAr: 'عمان', dialCode: '+968', flag: '🇴🇲' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', dialCode: '+962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', flag: '🇱🇧' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', dialCode: '+20', flag: '🇪🇬' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن', dialCode: '+967', flag: '🇾🇪' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', dialCode: '+970', flag: '🇵🇸' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', dialCode: '+212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', dialCode: '+213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس', dialCode: '+216', flag: '🇹🇳' },
  { code: 'LY', name: 'Libya', nameAr: 'ليبيا', dialCode: '+218', flag: '🇱🇾' },
  { code: 'SD', name: 'Sudan', nameAr: 'السودان', dialCode: '+249', flag: '🇸🇩' },
  { code: 'SO', name: 'Somalia', nameAr: 'الصومال', dialCode: '+252', flag: '🇸🇴' },
  { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي', dialCode: '+253', flag: '🇩🇯' },
  { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا', dialCode: '+222', flag: '🇲🇷' },
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', dialCode: '+1', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', flag: '🇬🇧' },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', dialCode: '+33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', dialCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', dialCode: '+34', flag: '🇪🇸' },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', dialCode: '+90', flag: '🇹🇷' },
  { code: 'IR', name: 'Iran', nameAr: 'إيران', dialCode: '+98', flag: '🇮🇷' },
  { code: 'IN', name: 'India', nameAr: 'الهند', dialCode: '+91', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', dialCode: '+92', flag: '🇵🇰' },
  { code: 'CN', name: 'China', nameAr: 'الصين', dialCode: '+86', flag: '🇨🇳' },
  { code: 'RU', name: 'Russia', nameAr: 'روسيا', dialCode: '+7', flag: '🇷🇺' },
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', dialCode: '+61', flag: '🇦🇺' },
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', dialCode: '+55', flag: '🇧🇷' },
];

interface PhoneInputProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  defaultCountry?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  id,
  value = '',
  onChange,
  placeholder,
  className = '',
  error = false,
  defaultCountry = 'IQ',
}) => {
  const { language } = useI18n();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const defaultCountryObj = countries.find((c) => c.code === defaultCountry) || countries.find((c) => c.code === 'IQ') || countries[0];
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountryObj);
  const [phoneNumber, setPhoneNumber] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const country = countries.find((c) => value.startsWith(c.dialCode));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(value.replace(country.dialCode, '').trim().replace(/\D/g, ''));
      } else {
        setPhoneNumber(value.replace(/\D/g, ''));
      }
    } else {
      setSelectedCountry(defaultCountryObj);
      setPhoneNumber('');
    }
  }, [value, defaultCountry]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    const fullNumber = country.dialCode + phoneNumber;
    onChange?.(fullNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPhoneNumber(digitsOnly);
    onChange?.(selectedCountry.dialCode + digitsOnly);
  };

  const isRTL = language === 'ar';

  return (
    <div className={`relative ${className}`} dir="ltr">
      <div
        className={`flex items-center border rounded-md ${
          error ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
        } bg-gray-50 dark:bg-gray-700 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500`}
      >
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className="flex items-center gap-2 px-3 py-2 border-r border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors whitespace-nowrap rounded-l-md"
          >
            <span className="text-xl flex-shrink-0">{selectedCountry.flag}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3.5rem] text-left">
              {selectedCountry.dialCode}
            </span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isDropdownOpen && (
            <div className="absolute z-[9999] left-0 top-full mt-1 w-72 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-xl">
              {countries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCountrySelect(country);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                    selectedCountry.code === country.code ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{country.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {language === 'ar' ? country.nameAr : country.name}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">{country.dialCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          className={`flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 min-w-0 rounded-r-md ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        />
      </div>
    </div>
  );
};

export default PhoneInput;
