import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { api } from "../services/api";
import { InlineMessage, PageHeading, ReportCard } from "../components/Shared";
import ReportMap from "../components/ReportMap";

const initial = {
  title: "",
  description: "",
  category: "",
  neighborhood: "",
  landmark: "",
  latitude: "",
  longitude: "",
};

export default function NewReport() {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [matches, setMatches] = useState([]);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [checked, setChecked] = useState(false);
  const [image, setImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const imageInput = useRef(null);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationToolsOpen, setLocationToolsOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (imagePreview) return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);
  useEffect(() => {
    api("/categories")
      .then((result) => setCategories(result.data))
      .catch((error) => setCategoryError(error.message));
  }, []);
  function set(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
    setErrors((old) => ({ ...old, [key]: undefined }));
    setMessage(null);
    setChecked(false);
  }
  function chooseMapLocation(location) {
    setForm((old) => ({
      ...old,
      latitude: location.latitude.toFixed(7),
      longitude: location.longitude.toFixed(7),
    }));
    setErrors((old) => ({
      ...old,
      latitude: undefined,
      longitude: undefined,
      coordinates: undefined,
    }));
    setLocationMessage(
      "Location selected. You can adjust it by clicking the map or editing the coordinates.",
    );
    setChecked(false);
  }
  function useCurrentLocation() {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        chooseMapLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocationMessage(
          `Current location added (about ${Math.round(coords.accuracy)} m accuracy).`,
        );
        setLocating(false);
      },
      (error) => {
        setLocationMessage(
          error.code === 1
            ? "Location permission was denied. You can still choose a point on the map."
            : "Could not get your location. Try selecting a point on the map.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }
  function validate() {
    const next = {};
    if (form.title.trim().length < 5)
      next.title = "Please use at least 5 characters.";
    if (form.description.trim().length < 10)
      next.description =
        "Add at least 10 characters so the team knows what to look for.";
    if (!categories.some((category) => category.slug === form.category))
      next.category = categoryError || "Choose an active issue category.";
    if (form.neighborhood.trim().length < 2)
      next.neighborhood = "Enter the neighborhood.";
    if (
      (form.latitude && !form.longitude) ||
      (!form.latitude && form.longitude)
    )
      next.coordinates = "Add both coordinates or leave both blank.";
    if (
      form.latitude &&
      (Number(form.latitude) < -90 ||
        Number(form.latitude) > 90 ||
        Number.isNaN(Number(form.latitude)))
    )
      next.latitude = "Latitude must be between -90 and 90.";
    if (
      form.longitude &&
      (Number(form.longitude) < -180 ||
        Number(form.longitude) > 180 ||
        Number.isNaN(Number(form.longitude)))
    )
      next.longitude = "Longitude must be between -180 and 180.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }
  function body() {
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      neighborhood: form.neighborhood.trim(),
      landmark: form.landmark.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
  }
  function chooseImage(event) {
    const file = event.target.files?.[0];
    setImageError("");
    setImagePreview("");
    setImage(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("The image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }
  function removeImage() {
    setImage(null);
    setImageError("");
    setImagePreview("");
    if (imageInput.current) imageInput.current.value = "";
  }
  async function checkDuplicates(event) {
    event.preventDefault();
    if (!validate()) return;
    setChecking(true);
    setMessage(null);
    try {
      const response = await api("/reports/check-duplicates", {
        method: "POST",
        body: JSON.stringify(body()),
      });
      setMatches(response.data || []);
      setChecked(true);
    } catch (e) {
      setMessage({
        type: "error",
        text: `We couldn’t check for similar reports: ${e.message} You can still submit your report.`,
      });
    } finally {
      setChecking(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const formData = new FormData();
      Object.entries(body()).forEach(([key, value]) => {
        if (value !== null && value !== "") formData.append(key, String(value));
      });
      if (image) formData.append("image", image);
      const response = await api("/reports", {
        method: "POST",
        body: formData,
      });
      navigate(`/reports/${response.data.id}`, { state: { created: true } });
    } catch (e) {
      const fieldErrors = Object.fromEntries(
        (e.details || []).map((item) => [item.field, item.message]),
      );
      setErrors((old) => ({ ...old, ...fieldErrors }));
      setMessage({ type: "error", text: e.message });
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="content-page form-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={15} /> Back to overview
      </Link>
      <PageHeading
        eyebrow="MAKE IT VISIBLE"
        title="Report a problem"
        description="A few clear details help your local team understand what’s happening and where."
      />
      <div className="form-layout">
        <form className="report-form" onSubmit={submit} noValidate>
          {message && (
            <InlineMessage type={message.type}>{message.text}</InlineMessage>
          )}
          <div className="form-section-head">
            <span>01</span>
            <div>
              <h2>What’s going on?</h2>
              <p>Tell us what you noticed. Keep it clear and specific.</p>
            </div>
          </div>
          <label className="field">
            Report title <span className="required">*</span>
            <input
              maxLength="180"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Streetlight out on Maple Avenue"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && (
              <small className="field-error">{errors.title}</small>
            )}
            <small className="field-hint">
              {form.title.length}/180 characters
            </small>
          </label>
          <label className="field">
            Description <span className="required">*</span>
            <textarea
              rows="5"
              maxLength="5000"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What happened? When did you first notice it? Any details that could help the team find it?"
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description && (
              <small className="field-error">{errors.description}</small>
            )}
            <small className="field-hint">
              A helpful description gets the right attention.
            </small>
          </label>
          <label className="field">
            Type of issue <span className="required">*</span>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              aria-invalid={Boolean(errors.category)}
              disabled={!categories.length}
            >
              <option value="">
                {categories.length
                  ? "Choose a category"
                  : "Loading categories…"}
              </option>
              {categories.map((category) => (
                <option value={category.slug} key={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <small className="field-error">{errors.category}</small>
            )}
          </label>
          <div className="form-section-head second">
            <span>02</span>
            <div>
              <h2>Help us find it</h2>
              <p>
                A neighborhood and landmark give the team a good starting point.
              </p>
            </div>
          </div>
          <label className="field">
            Neighborhood <span className="required">*</span>
            <input
              maxLength="120"
              value={form.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
              placeholder="e.g. Bole"
              aria-invalid={Boolean(errors.neighborhood)}
            />
            {errors.neighborhood && (
              <small className="field-error">{errors.neighborhood}</small>
            )}
          </label>
          <label className="field">
            Nearby landmark <span className="optional">OPTIONAL</span>
            <input
              maxLength="255"
              value={form.landmark}
              onChange={(e) => set("landmark", e.target.value)}
              placeholder="A building, shop, school, or nearby street"
            />
            <small className="field-hint">
              For example, “opposite Bole clinic entrance”.
            </small>
          </label>
          <div className="field image-field">
            <span>
              Photo of the problem <span className="optional">OPTIONAL</span>
            </span>
            <label
              className={`image-picker ${imagePreview ? "has-image" : ""}`}
            >
              <input
                ref={imageInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseImage}
              />
              <span className="image-picker-mark">
                <MapPin size={18} />
              </span>
              <span className="image-picker-copy">
                <b>{image ? image.name : "Add a photo"}</b>
                <small>JPEG, PNG, or WebP · up to 5 MB</small>
              </span>
              <span className="image-picker-button">Browse</span>
            </label>
            {imageError && (
              <small className="field-error" role="alert">
                {imageError}
              </small>
            )}
            {imagePreview && (
              <div className="image-preview">
                <img
                  src={imagePreview}
                  alt="Preview of the image attached to this report"
                />
                <button type="button" onClick={removeImage}>
                  Remove photo
                </button>
              </div>
            )}
            <small className="field-hint">
              A clear photo helps the local team understand what to look for.
              Please avoid including people’s faces.
            </small>
          </div>
          <details
            className="coordinates"
            onToggle={(event) => setLocationToolsOpen(event.currentTarget.open)}
          >
            <summary>
              <MapPin size={15} /> Add a map location{" "}
              <span className="optional">OPTIONAL</span>
            </summary>
            <p>
              Use your location, click the map, or enter coordinates to pinpoint
              the issue.
            </p>
            <button
              type="button"
              className="btn btn-secondary locate-button"
              onClick={useCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                "Finding your location…"
              ) : (
                <>
                  <MapPin size={15} /> Use my current location
                </>
              )}
            </button>
            {locationMessage && (
              <small className="location-message" role="status">
                {locationMessage}
              </small>
            )}
            <div className="coordinate-row">
              <label className="field">
                Latitude
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => set("latitude", e.target.value)}
                  placeholder="9.0222"
                  aria-invalid={Boolean(errors.latitude)}
                />
                {errors.latitude && (
                  <small className="field-error">{errors.latitude}</small>
                )}
              </label>
              <label className="field">
                Longitude
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => set("longitude", e.target.value)}
                  placeholder="38.7468"
                  aria-invalid={Boolean(errors.longitude)}
                />
                {errors.longitude && (
                  <small className="field-error">{errors.longitude}</small>
                )}
              </label>
            </div>
            {errors.coordinates && (
              <small className="field-error">{errors.coordinates}</small>
            )}
            <p className="map-picker-instruction">
              Click the map to place or move the location pin.
            </p>
            {locationToolsOpen && (
              <ReportMap
                reports={[]}
                selectedLocation={
                  form.latitude && form.longitude
                    ? {
                        latitude: Number(form.latitude),
                        longitude: Number(form.longitude),
                      }
                    : null
                }
                onPick={chooseMapLocation}
                className="location-picker-map"
              />
            )}
          </details>
          <div className="form-divider" />
          <button
            type="button"
            onClick={checkDuplicates}
            disabled={checking || submitting}
            className="btn btn-secondary duplicate-check"
          >
            <Sparkles size={16} />
            {checking
              ? "Checking nearby reports…"
              : "Check for similar reports"}
            <ArrowRight size={15} />
          </button>
          {checked && matches.length > 0 && (
            <div className="duplicate-results">
              <div className="duplicate-heading">
                <TriangleAlert size={18} />
                <div>
                  <b>We found some reports that may be related</b>
                  <span>
                    These are suggestions. You can still submit a new report.
                  </span>
                </div>
              </div>
              <div className="duplicate-list">
                {matches.slice(0, 3).map(({ report, score, reasons }) => (
                  <Link
                    key={report.id}
                    to={`/reports/${report.id}`}
                    className="duplicate-item"
                  >
                    <span>
                      <b>{report.title}</b>
                      <small>
                        {report.neighborhood} · {reasons.join(" · ")}
                      </small>
                    </span>
                    <span className="similarity-score">
                      {score}% match <ArrowRight size={13} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {checked && matches.length === 0 && (
            <div className="duplicate-clear">
              <CheckCircle2 size={16} /> No close matches found. Your report is
              ready to go.
            </div>
          )}
          <div className="submit-row">
            <span>
              <ShieldCheck size={15} /> Your report will be visible to the
              community.
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                "Sending report…"
              ) : (
                <>
                  Submit report <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
        <aside className="form-aside">
          <div className="aside-note">
            <span className="aside-note-icon">
              <Sparkles size={19} />
            </span>
            <p className="eyebrow">A GOOD REPORT HELPS</p>
            <h3>Small details make a big difference.</h3>
            <p>
              Include a nearby landmark or describe when you noticed the issue.
              It helps your neighbors and local teams act with confidence.
            </p>
          </div>
          <div className="aside-example">
            <b>What happens next?</b>
            <div className="mini-step">
              <span>1</span>
              <p>Your report appears in the community feed.</p>
            </div>
            <div className="mini-step">
              <span>2</span>
              <p>Neighbors can confirm if they’ve seen it too.</p>
            </div>
            <div className="mini-step">
              <span>3</span>
              <p>Local staff share updates as work progresses.</p>
            </div>
          </div>
          <div className="privacy-note">
            <ShieldCheck size={16} />
            <span>
              Report submissions are public. Avoid adding personal or sensitive
              information.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
