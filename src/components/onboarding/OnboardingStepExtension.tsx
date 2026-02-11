import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Chrome, Check, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface OnboardingStepExtensionProps {
  onBack: () => void;
  onNext: () => void;
}

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/linkedbot-linkedin-automa/mmdcbopjeijbhecfnnpjehledechmbbo";

const steps = [
  { label: "Account Type", done: true },
  { label: "Your Details", done: true },
  { label: "Install Extension", active: true },
];

export const OnboardingStepExtension = ({
  onBack,
  onNext,
}: OnboardingStepExtensionProps) => {
  return (
    <motion.div
      key="step-extension"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-center mb-8">
        {/* Chrome icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4285F4] via-[#34A853] to-[#FBBC05] flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Chrome className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-2xl font-bold mb-2">
          Install LinkedBot Chrome Extension
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          To start automating your LinkedIn posting, please install our Chrome Extension.
        </p>
      </div>

      {/* Step indicator */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.done
                      ? "bg-green-500 text-white"
                      : step.active
                      ? "gradient-bg text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.done ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-sm hidden sm:inline ${
                    step.active ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <div className="w-8 lg:w-16 h-px bg-border mx-1" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex flex-col items-center gap-4">
        <Button
          size="xl"
          className="gap-3 bg-[#4285F4] hover:bg-[#3367D6] text-white shadow-lg hover:shadow-xl transition-all px-10"
          onClick={() => window.open(CHROME_STORE_URL, "_blank")}
        >
          <Download className="w-5 h-5" />
          Add to Chrome
          <ExternalLink className="w-4 h-4 opacity-60" />
        </Button>

        <p className="text-sm text-muted-foreground text-center max-w-sm">
          After installing, come back here and click <strong>Continue</strong>.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={onNext}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          Continue to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};
