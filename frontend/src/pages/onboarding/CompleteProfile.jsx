import { useState } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { completeProfile, getCurrentUser } from "@/services/auth.service";
import { setUser } from "@/store/authSlice";

export default function CompleteProfile() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  const [preview, setPreview] = useState(null);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillsError, setSkillsError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { isSubmitting, errors, isSubmitted },
  } = useForm({
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  // keep RHF's onChange and add the preview on top of it
  const { onChange: onPicChange, ...picField } = register("profilePic", {
    required: "Required",
  });

  const handlePicChange = (e) => {
    onPicChange(e);
    const file = e.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const addSkill = () => {
    const value = skillInput.trim();
    if (!value || skills.includes(value)) return;
    setSkills((prev) => [...prev, value]);
    setSkillInput("");
    setSkillsError("");
  };

  const removeSkill = (skill) => {
    const updated = skills.filter((s) => s !== skill);
    setSkills(updated);

    if (updated.length === 0 && isSubmitted) {
      setSkillsError("*Required");
    }
  };

  const onSubmit = async (data) => {
    clearErrors("root");

    if (skills.length === 0) {
      setSkillsError("*Required");
      return;
    }

    const formData = new FormData();
    const pic = data.profilePic?.[0];
    if (pic) formData.append("profilePic", pic);
    formData.append("fullname", data.fullname);
    formData.append("phone", data.phone);
    formData.append("bio", data.bio);
    formData.append("skills", skills.join(","));

    try {
      await completeProfile(formData);
      const res = await getCurrentUser();
      // isProfileComplete flips to true and RequireProfileIncomplete redirects
      dispatch(setUser(res.data));
    } catch (err) {
      setError("root", { message: err.message || "Could not save your profile" });
    }
  };

  return (
    <>
      <div className="w-full bg-[rgb(var(--color-surface-base))] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
        <div className="bg-[rgb(var(--color-background-app))] flex items-center justify-center px-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full max-w-5xl bg-[rgb(var(--color-surface-base))] border border-[rgb(var(--color-border-default)/0.06)] rounded-2xl shadow-sm px-12 py-10"
          >
            {/* Header */}
            <div className="mb-10">
              <h1 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))]">
                Complete your profile
              </h1>
              <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                This information helps your team recognize you.
              </p>
            </div>

            {/* PROFILE ROW */}
            <div className="flex gap-14 mb-10 items-start">
              {/* Profile photo */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-32 h-32 rounded-full border border-[rgb(var(--color-brand-accent))] bg-[rgb(var(--color-accent-muted))] overflow-hidden focus-within:ring-2 focus-within:ring-[rgb(var(--color-brand-secondary))]">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-sm text-[rgb(var(--color-brand-secondary))]">
                      Upload photo
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Profile photo"
                    {...picField}
                    onChange={handlePicChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <span className="text-xs text-[rgb(var(--color-text-secondary))]">
                  Profile photo
                </span>

                <span className="text-xs text-[rgb(var(--color-text-secondary))] min-h-[16px]">
                  {isSubmitted && errors.profilePic?.message
                    ? `*${errors.profilePic.message}`
                    : ""}
                </span>
              </div>

              {/* Fields */}
              <div className="flex-1 grid grid-cols-2 gap-x-10 gap-y-6">
                <Field label="Username">
                  <input
                    readOnly
                    value={user?.username ?? ""}
                    className="w-full px-4 py-2.5 rounded-lg bg-[rgb(var(--color-background-subtle))] border border-[rgb(var(--color-border-subtle)/0.04)] text-[rgb(var(--color-text-primary))] cursor-not-allowed"
                  />
                </Field>

                <Field label="Email">
                  <input
                    readOnly
                    value={user?.email ?? ""}
                    className="w-full px-4 py-2.5 rounded-lg bg-[rgb(var(--color-background-subtle))] border border-[rgb(var(--color-border-subtle)/0.04)] text-[rgb(var(--color-text-primary))] cursor-not-allowed"
                  />
                </Field>

                <Field
                  label="Full name "
                  error={isSubmitted ? errors.fullname?.message : ""}
                >
                  <input
                    {...register("fullname", { required: "Required" })}
                    className="input"
                  />
                </Field>

                <Field
                  label="Phone number "
                  error={isSubmitted ? errors.phone?.message : ""}
                >
                  <input
                    {...register("phone", { required: "Required" })}
                    className="input"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </Field>
              </div>
            </div>

            {/* SKILLS */}
            <div className="mb-10">
              <div className="flex items-baseline justify-between min-h-[20px]">
                <label htmlFor="skill-input" className="label">
                  Skills{" "}
                </label>
                <span className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">
                  {isSubmitted ? skillsError : ""}
                </span>
              </div>

              <div className="flex gap-3 mt-2">
                <input
                  id="skill-input"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  className="input flex-1 border border-[rgb(var(--color-border-focus))]"
                  placeholder="Add a skill"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  aria-label="Add skill"
                  className="w-12 h-12 rounded-xl bg-[rgb(var(--color-brand-primary))] text-[rgb(var(--color-text-inverse))] text-xl"
                >
                  +
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 rounded-full bg-[rgb(var(--color-accent-muted))] text-[rgb(var(--color-text-primary))] text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      aria-label={`Remove ${skill}`}
                      className="hover:text-black"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* BIO */}
            <Field
              label="Bio "
              error={isSubmitted ? errors.bio?.message : ""}
            >
              <textarea
                {...register("bio", { required: "Required" })}
                className="textarea"
                placeholder="Tell us about yourself..."
              />
            </Field>

            {errors.root && (
              <p
                role="alert"
                className="mt-6 text-sm text-[rgb(var(--color-status-error))]"
              >
                {errors.root.message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full h-12 rounded-xl bg-[rgb(var(--color-brand-primary))] text-[rgb(var(--color-text-inverse))] font-medium transition disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/* Field with reserved error slot */
function Field({ label, error, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between min-h-[20px] mb-1.5 gap-3">
        <label className="text-sm font-medium text-[rgb(var(--color-text-primary))]">
          {label}
        </label>
        <span className="text-xs font-medium text-[rgb(var(--color-text-secondary))]">
          {error ? `*${error}` : ""}
        </span>
      </div>
      {children}
    </div>
  );
}
