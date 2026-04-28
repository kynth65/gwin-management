"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, X, Palette, Building2 } from "lucide-react";
import { useCustomization } from "./customization-context";
import { applyColorTheme } from "@/lib/color-utils";
import { useSession } from "next-auth/react";

export function CustomizationForm() {
  const { config, updateConfig } = useCustomization();
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  const [businessName, setBusinessName] = useState(config.businessName);
  const [primaryColor, setPrimaryColor] = useState(config.primaryColor);
  const [hexInput, setHexInput] = useState(config.primaryColor);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(config.iconUrl);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return (
      <div className="bg-card border rounded-lg p-6 text-sm text-muted-foreground">
        Only admins can change customization settings.
      </div>
    );
  }

  function handleColorPickerChange(hex: string) {
    setPrimaryColor(hex);
    setHexInput(hex);
    applyColorTheme(hex);
  }

  function handleHexInputChange(value: string) {
    setHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setPrimaryColor(value);
      applyColorTheme(value);
    }
  }

  function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeIcon() {
    setIconFile(null);
    setIconPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    setSaving(true);
    try {
      let iconUrl = config.iconUrl;

      if (iconFile) {
        const formData = new FormData();
        formData.append("icon", iconFile);
        const res = await fetch("/api/customization/icon", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Icon upload failed");
        const data = await res.json();
        iconUrl = data.url;
      } else if (iconPreview === null) {
        iconUrl = null;
      }

      const res = await fetch("/api/customization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, primaryColor, iconUrl }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const updated = await res.json();
      updateConfig(updated);
      setIconFile(null);
      toast.success("Customization saved!");
    } catch {
      toast.error("Failed to save customization");
      // Revert live preview on failure
      applyColorTheme(config.primaryColor);
      setPrimaryColor(config.primaryColor);
      setHexInput(config.primaryColor);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-card border rounded-lg p-6 space-y-7">
      {/* Business Name */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Business Name
        </label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="My Business"
          className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground">
          Shown in the sidebar and browser tab.
        </p>
      </div>

      {/* Business Icon */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Upload className="h-4 w-4 text-muted-foreground" />
          Business Icon
        </label>
        <div className="flex items-center gap-4">
          {iconPreview ? (
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={iconPreview}
                alt="Business icon"
                className="w-14 h-14 rounded-xl object-cover border shadow-sm"
              />
              <button
                onClick={removeIcon}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
          )}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent transition-colors"
            >
              {iconPreview ? "Change Image" : "Upload Image"}
            </button>
            <p className="text-xs text-muted-foreground">PNG, JPG, SVG · Max 2MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleIconChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Color Theme */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Palette className="h-4 w-4 text-muted-foreground" />
          Color Theme
        </label>

        <div className="flex items-center gap-3">
          {/* Color swatch — clicking it opens the native color wheel */}
          <div className="relative shrink-0">
            <div
              className="w-14 h-14 rounded-xl border-2 border-border shadow-sm cursor-pointer transition-transform hover:scale-105"
              style={{ background: primaryColor }}
            />
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => handleColorPickerChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-xl"
              title="Open color picker"
            />
          </div>

          {/* Hex input */}
          <div className="flex-1 max-w-[140px]">
            <input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value)}
              maxLength={7}
              placeholder="#000000"
              className="w-full px-3 py-2 border rounded-md text-sm font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary uppercase"
            />
          </div>

          {/* Live color palette preview */}
          <div className="flex gap-1.5 flex-wrap">
            {generatePaletteSwatches(primaryColor).map(({ label, bg }) => (
              <div
                key={label}
                className="w-7 h-7 rounded-md shadow-sm border border-white/10"
                style={{ background: bg }}
                title={label}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Click the swatch to open the color wheel. Colors update live across the entire app.
        </p>
      </div>

      <div className="pt-1 flex items-center justify-between">
        <button
          onClick={() => {
            handleColorPickerChange("#761f7f");
            setBusinessName("GWIN Management");
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset to default
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function generatePaletteSwatches(hex: string) {
  return [
    { label: "Sidebar dark", bg: `color-mix(in srgb, ${hex} 30%, #000)` },
    { label: "Primary", bg: hex },
    { label: "Light tint", bg: `color-mix(in srgb, ${hex} 20%, #fff)` },
    { label: "Subtle bg", bg: `color-mix(in srgb, ${hex} 8%, #fff)` },
  ];
}
