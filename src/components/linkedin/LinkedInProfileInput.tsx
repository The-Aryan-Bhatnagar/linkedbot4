import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Linkedin, AlertCircle, CheckCircle, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkedInProfileInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  showLabel?: boolean;
  className?: string;
}

const LINKEDIN_URL_REGEX = /^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;

export const validateLinkedInUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url.trim()) {
    return { isValid: false, error: 'LinkedIn profile URL is required' };
  }
  
  if (!url.startsWith('https://')) {
    return { isValid: false, error: 'URL must start with https://' };
  }
  
  if (!url.includes('linkedin.com/in/')) {
    return { isValid: false, error: 'Must be a LinkedIn profile URL (linkedin.com/in/...)' };
  }
  
  if (!LINKEDIN_URL_REGEX.test(url)) {
    return { isValid: false, error: 'Invalid LinkedIn profile URL format' };
  }
  
  return { isValid: true };
};

export const LinkedInProfileInput: React.FC<LinkedInProfileInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  showLabel = true,
  className,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [touched, setTouched] = useState(false);
  
  const validation = touched ? validateLinkedInUrl(value) : { isValid: true };
  const displayError = error || (!validation.isValid ? validation.error : undefined);
  const isValid = value && validation.isValid && !error;

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <Label htmlFor="linkedin-url" className="flex items-center gap-2">
          <Linkedin className="w-4 h-4 text-[#0A66C2]" />
          LinkedIn Profile URL
        </Label>
      )}
      
      <div className="relative">
        <Input
          id="linkedin-url"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="https://www.linkedin.com/in/your-name-123/"
          disabled={disabled}
          className={cn(
            'pr-10',
            displayError && 'border-destructive focus-visible:ring-destructive',
            isValid && 'border-green-500 focus-visible:ring-green-500'
          )}
        />
        {isValid && (
          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
        )}
        {displayError && touched && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
        )}
      </div>
      
      {displayError && touched && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {displayError}
        </p>
      )}
      
      {/* Help toggle */}
      <button
        type="button"
        onClick={() => setShowHelp(!showHelp)}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        How to find my profile URL?
        {showHelp ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>
      
      {/* Help content */}
      {showHelp && (
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2 border border-border">
          <p className="font-medium text-foreground">📍 How to Find Your LinkedIn Profile URL:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Go to <span className="text-foreground">LinkedIn.com</span></li>
            <li>Click <span className="text-foreground">"Me"</span> in the top navigation</li>
            <li>Click <span className="text-foreground">"View Profile"</span></li>
            <li>Copy the URL from your browser's address bar</li>
            <li>It should look like: <code className="bg-muted px-1 rounded text-foreground">https://www.linkedin.com/in/your-name-123/</code></li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default LinkedInProfileInput;
