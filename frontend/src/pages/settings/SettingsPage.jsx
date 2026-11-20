import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
} from "lucide-react";
import { updateProfileThunk, updatePasswordThunk, clearUser } from "@/store/authSlice";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

const PASSWORD_RE = /^(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MSG = "Password must be at least 8 characters and contain at least 1 symbol.";

export default function SettingsPage() {
  const location = useLocation();
  const currentUser = useSelector((s) => s.auth.user);
  const authLoading = useSelector((s) => s.auth.loading);

  const stateTab = location.state?.tab;
  const [selectedTab, setSelectedTab] = useState(null);
  const activeTab = selectedTab ?? (stateTab === "password" ? "password" : "profile");

  if (authLoading && !currentUser) {
    return <SettingsSkeleton />;
  }

  if (!currentUser) {
    return (
      <EmptyState
        title="User not found"
        description="Please sign in to view and edit your account settings."
      />
    );
  }

  return (
    <section className="space-y-6">
      {/* Page Header */}
      <header>
        <div className="flex items-center gap-2 text-brand-primary">
          <SettingsIcon size={20} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.12em]">
            Account
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your personal profile details and security preferences.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setSelectedTab("profile")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "profile"
              ? "bg-brand-primary text-text-inverse"
              : "text-text-secondary hover:bg-background-subtle hover:text-text-primary"
          }`}
        >
          <User size={16} />
          Profile
        </button>

        <button
          type="button"
          onClick={() => setSelectedTab("password")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "password"
              ? "bg-brand-primary text-text-inverse"
              : "text-text-secondary hover:bg-background-subtle hover:text-text-primary"
          }`}
        >
          <Lock size={16} />
          Password & Security
        </button>
      </div>

      {/* Tab Panels */}
      <div className="max-w-3xl">
        {activeTab === "profile" ? (
          <ProfileSection user={currentUser} />
        ) : (
          <PasswordSection />
        )}
      </div>
    </section>
  );
}

/* =========================================================================
   PROFILE SECTION
   ========================================================================= */
function ProfileSection({ user }) {
  const dispatch = useDispatch();
  const [preview, setPreview] = useState(user?.profilePictureUrl || null);
  const [notice, setNotice] = useState("");
  const [serverError, setServerError] = useState("");

  const defaultSkills = Array.isArray(user?.skills)
    ? user.skills.join(", ")
    : user?.skills || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullname: user?.fullname || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      skills: defaultSkills,
    },
  });

  const { onChange: onPicChange, ...picField } = register("profilePic");

  const handlePicChange = (e) => {
    onPicChange(e);
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    setServerError("");
    setNotice("");

    const formData = new FormData();
    const picFile = data.profilePic?.[0];
    if (picFile) {
      formData.append("profilePic", picFile);
    }
    if (data.fullname?.trim()) formData.append("fullname", data.fullname.trim());
    if (data.phone?.trim()) formData.append("phone", data.phone.trim());
    if (data.bio?.trim()) formData.append("bio", data.bio.trim());
    if (data.skills !== undefined) formData.append("skills", data.skills.trim());

    try {
      await dispatch(updateProfileThunk(formData)).unwrap();
      setNotice("Profile updated successfully.");
    } catch (err) {
      setServerError(typeof err === "string" ? err : "Failed to update profile.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-base p-6 shadow-soft sm:p-8">
      <div className="border-b border-border pb-4 mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Profile Information</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Update your public profile and workspace identity.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          className="mb-6 flex items-center gap-2 rounded-xl border border-status-success/20 bg-status-success/5 p-4 text-sm text-status-success"
        >
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-xl border border-status-error/20 bg-status-error/5 p-4 text-sm text-status-error"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Picture */}
        <div>
          <label className="label">Profile Photo</label>
          <div className="flex items-center gap-5 mt-2">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border bg-background-subtle">
              {preview ? (
                <img
                  src={preview}
                  alt="Profile Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Avatar
                  user={user}
                  className="h-full w-full text-xl font-semibold text-text-primary"
                />
              )}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface-base px-4 py-2 text-xs font-medium text-text-primary shadow-sm hover:bg-background-subtle">
              <Camera size={14} />
              Change Photo
              <input
                type="file"
                accept="image/*"
                aria-label="Upload profile photo"
                {...picField}
                onChange={handlePicChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Read-only account info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              readOnly
              value={user?.username || ""}
              className="input bg-background-subtle text-text-muted cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-text-muted">Username cannot be changed.</p>
          </div>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              readOnly
              value={user?.email || ""}
              className="input bg-background-subtle text-text-muted cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-text-muted">Managed via workspace authentication.</p>
          </div>
        </div>

        {/* Full Name & Phone */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fullname-input" className="label">
              Full Name
            </label>
            <input
              id="fullname-input"
              type="text"
              placeholder="e.g. Jane Doe"
              {...register("fullname", { required: "Full name is required" })}
              className="input"
            />
            {errors.fullname && (
              <p className="mt-1 text-xs text-status-error">{errors.fullname.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone-input" className="label">
              Phone Number
            </label>
            <input
              id="phone-input"
              type="tel"
              placeholder="e.g. +1 555-0199"
              {...register("phone")}
              className="input"
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <label htmlFor="skills-input" className="label">
            Skills (comma-separated)
          </label>
          <input
            id="skills-input"
            type="text"
            placeholder="React, Node.js, TypeScript, UI/UX"
            {...register("skills")}
            className="input"
          />
          <p className="mt-1 text-[11px] text-text-secondary">
            Separate multiple skills with commas.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio-input" className="label">
            Bio
          </label>
          <textarea
            id="bio-input"
            rows={3}
            placeholder="Tell your team about your role, background, or interests..."
            {...register("bio")}
            className="textarea"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-text-inverse shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Saving Changes…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================================
   PASSWORD SECTION
   ========================================================================= */
function PasswordSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [notice, setNotice] = useState("");
  const [serverError, setServerError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data) => {
    setServerError("");
    setNotice("");

    try {
      await dispatch(
        updatePasswordThunk({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        })
      ).unwrap();

      // Password changed successfully; server clears cookies on success
      setNotice(
        "Password changed successfully! You will be redirected to sign in with your new credentials."
      );
      setRedirecting(true);
      reset();

      // Clear local auth state and navigate to /auth after a brief pause
      dispatch(clearUser());
      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 1800);
    } catch (err) {
      setServerError(typeof err === "string" ? err : "Failed to change password.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-base p-6 shadow-soft sm:p-8">
      <div className="border-b border-border pb-4 mb-6">
        <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Ensure your account uses a secure password of at least 8 characters with at least 1 symbol.
        </p>
      </div>

      {notice && (
        <div
          role="status"
          className="mb-6 flex flex-col gap-2 rounded-xl border border-status-success/20 bg-status-success/5 p-4 text-sm text-status-success"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/auth", { replace: true })}
            className="w-fit text-xs font-semibold underline"
          >
            Go to sign in now →
          </button>
        </div>
      )}

      {serverError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-xl border border-status-error/20 bg-status-error/5 p-4 text-sm text-status-error"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Current Password */}
        <div>
          <label htmlFor="current-password" className="label">
            Current Password
          </label>
          <div className="relative">
            <input
              id="current-password"
              type={showCurrent ? "text" : "password"}
              disabled={redirecting}
              autoComplete="current-password"
              {...register("currentPassword", {
                required: "Current password is required",
              })}
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              aria-label={showCurrent ? "Hide current password" : "Show current password"}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-status-error">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="new-password" className="label">
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showNew ? "text" : "password"}
              disabled={redirecting}
              autoComplete="new-password"
              {...register("newPassword", {
                required: "New password is required",
                pattern: {
                  value: PASSWORD_RE,
                  message: PASSWORD_MSG,
                },
              })}
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              aria-label={showNew ? "Hide new password" : "Show new password"}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.newPassword ? (
            <p className="mt-1 text-xs text-status-error">
              {errors.newPassword.message}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-text-secondary">
              Must be at least 8 characters and contain at least 1 symbol.
            </p>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label htmlFor="confirm-password" className="label">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              disabled={redirecting}
              autoComplete="new-password"
              {...register("confirmPassword", {
                required: "Please confirm your new password",
                validate: (val) =>
                  val === getValues("newPassword") || "Passwords do not match",
              })}
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-status-error">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={isSubmitting || redirecting}
            className="inline-flex items-center justify-center rounded-full bg-brand-primary px-6 py-2.5 text-sm font-medium text-text-inverse shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Updating Password…" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* =========================================================================
   SKELETON
   ========================================================================= */
function SettingsSkeleton() {
  return (
    <section className="space-y-6" aria-label="Loading settings">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>
      <div className="max-w-3xl rounded-2xl border border-border bg-surface-base p-6 space-y-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </section>
  );
}
