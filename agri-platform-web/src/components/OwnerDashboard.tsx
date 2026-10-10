// src/components/OwnerDashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import API from "../services/api";
import {
  Minus,
  Plus,
  PlusCircle,
  RotateCcw,
  Tractor,
  Trash2,
  X,
} from "lucide-react";
import TimedNotice from "./TimedNotice";

interface OwnerEquipment {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price_per_acre: number;
  is_available: boolean;
  image_urls?: string[];
}

interface SelectedEquipmentImage {
  url: string;
  alt: string;
}

export default function OwnerDashboard({
  onListingCreated,
}: {
  onListingCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Tractor");
  const [description, setDescription] = useState("");
  const [capacitySpec, setCapacitySpec] = useState("");
  const [pricePerAcre, setPricePerAcre] = useState("");
  const [latitude, setLatitude] = useState("-1.2921");
  const [longitude, setLongitude] = useState("36.8219");
  const [serviceRadius, setServiceRadius] = useState("20");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [ownedEquipment, setOwnedEquipment] = useState<OwnerEquipment[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(true);
  const [equipmentLoadFailed, setEquipmentLoadFailed] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<SelectedEquipmentImage | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const imagePreviewsRef = useRef<string[]>([]);

  useEffect(
    () => () =>
      imagePreviewsRef.current.forEach((preview) =>
        URL.revokeObjectURL(preview),
      ),
    [],
  );

  useEffect(() => {
    const fetchOwnedEquipment = async () => {
      try {
        const response = await API.get("/equipment/mine");
        setOwnedEquipment(response.data.equipment);
        setEquipmentLoadFailed(false);
      } catch (err: unknown) {
        console.error("Error fetching your equipment:", err);
        setEquipmentLoadFailed(true);
        const responseMessage = isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message
          : undefined;
        setErrorMsg(
          responseMessage ||
            "Could not load your equipment. Please try again.",
        );
      } finally {
        setIsLoadingEquipment(false);
      }
    };

    fetchOwnedEquipment();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("description", description);
      formData.append("capacity_spec", capacitySpec);
      formData.append("price_per_acre", pricePerAcre);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("service_radius_km", serviceRadius);
      images.forEach((image) => formData.append("images", image));

      await API.post("/equipment", formData);

      setSuccessMsg("Equipment listed successfully!");
      setName("");
      setDescription("");
      setPricePerAcre("");
      setImages([]);
      imagePreviewsRef.current.forEach((preview) =>
        URL.revokeObjectURL(preview),
      );
      imagePreviewsRef.current = [];
      setImagePreviews([]);
      setIsCreating(false);
      onListingCreated();
      try {
        const response = await API.get("/equipment/mine");
        setOwnedEquipment(response.data.equipment);
        setEquipmentLoadFailed(false);
      } catch (refreshError: unknown) {
        console.error("Equipment was uploaded but its list could not refresh:", refreshError);
        setEquipmentLoadFailed(true);
        setErrorMsg(
          "Your machine was uploaded, but the list could not refresh. Reload this page to see it.",
        );
      }
    } catch (err: unknown) {
      const responseMessage = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setErrorMsg(
        responseMessage ||
          "Failed to list equipment. Ensure you are logged in as an Equipment Owner.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedImages = Array.from(event.target.files ?? []);
    if (selectedImages.length > 5) {
      setErrorMsg("Choose up to 5 images for one equipment listing.");
      event.target.value = "";
      return;
    }
    if (selectedImages.some((image) => image.size > 5 * 1024 * 1024)) {
      setErrorMsg("Each image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setErrorMsg("");
    imagePreviewsRef.current.forEach((preview) =>
      URL.revokeObjectURL(preview),
    );
    const previews = selectedImages.map((image) => URL.createObjectURL(image));
    imagePreviewsRef.current = previews;
    setImagePreviews(previews);
    setImages(selectedImages);
  };

  const handleDeleteEquipment = async (equipment: OwnerEquipment) => {
    setDeletingId(equipment.id);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await API.delete(`/equipment/${equipment.id}`);
      setOwnedEquipment((current) =>
        current.filter((item) => item.id !== equipment.id),
      );
      setPendingDeleteId(null);
      setSuccessMsg(`${equipment.name} was deleted.`);
    } catch (err: unknown) {
      const responseMessage = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setErrorMsg(
        responseMessage || "Could not delete this machine. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const openImage = (equipmentName: string, imageUrl: string, index: number) => {
    setSelectedImage({
      url: new URL(imageUrl, API.defaults.baseURL).toString(),
      alt: `${equipmentName} photo ${index + 1}`,
    });
    setImageZoom(1);
  };

  useEffect(() => {
    if (!selectedImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage]);

  return (
    <section className="owner-dashboard">
      {!isCreating ? (
        <div className="owner-list-panel">
          <div className="owner-list-heading">
            <div>
              <p className="owner-dashboard-eyebrow">Equipment owner</p>
              <h1>Your uploaded machines</h1>
              <p>Review your listings and add machinery whenever you’re ready.</p>
            </div>
            <span className="owner-list-count">
              {ownedEquipment.length}{" "}
              {ownedEquipment.length === 1 ? "machine" : "machines"}
            </span>
          </div>

          {successMsg && (
            <TimedNotice
              key={successMsg}
              message={successMsg}
              type="success"
              onDismiss={() => setSuccessMsg("")}
            />
          )}
          {errorMsg && (
            <TimedNotice
              key={errorMsg}
              message={errorMsg}
              type="error"
              onDismiss={() => setErrorMsg("")}
            />
          )}

          {isLoadingEquipment ? (
            <p className="owner-list-feedback">Loading your machines...</p>
          ) : equipmentLoadFailed ? (
            <div className="owner-list-empty" role="status">
              <Tractor aria-hidden="true" />
              <h2>Your machines could not be loaded</h2>
              <p>Refresh the page to try loading your uploaded listings again.</p>
            </div>
          ) : ownedEquipment.length === 0 ? (
            <div className="owner-list-empty">
              <Tractor aria-hidden="true" />
              <h2>No machines uploaded yet</h2>
              <p>Your machinery listings will appear here after you upload them.</p>
            </div>
          ) : (
            <div className="owner-equipment-grid">
              {ownedEquipment.map((equipment) => (
                <article className="owner-equipment-card" key={equipment.id}>
                  {equipment.image_urls?.length ? (
                    <div
                      className="owner-equipment-photos"
                      aria-label={`${equipment.name} photos`}
                    >
                      {equipment.image_urls.map((imageUrl, index) => (
                        <button
                          type="button"
                          className="owner-equipment-photo-button"
                          key={`${imageUrl}-${index}`}
                          onClick={() =>
                            openImage(equipment.name, imageUrl, index)
                          }
                          aria-label={`View ${equipment.name} photo ${index + 1}`}
                        >
                          <img
                            src={new URL(
                              imageUrl,
                              API.defaults.baseURL,
                            ).toString()}
                            alt=""
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="owner-equipment-placeholder">
                      <Tractor aria-hidden="true" />
                      <span>No photo added</span>
                    </div>
                  )}
                  <div className="owner-equipment-details">
                    <div className="owner-equipment-meta">
                      <span>{equipment.category}</span>
                      <span
                        className={
                          equipment.is_available
                            ? "owner-equipment-status is-available"
                            : "owner-equipment-status"
                        }
                      >
                        {equipment.is_available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <h2>{equipment.name}</h2>
                    <p>
                      {equipment.description || "No description provided."}
                    </p>
                    <strong>
                      KES {equipment.price_per_acre} <small>/ acre</small>
                    </strong>
                    {pendingDeleteId === equipment.id ? (
                      <div className="owner-delete-confirm">
                        <span>Delete this machine and its photos?</span>
                        <div>
                          <button
                            type="button"
                            className="owner-delete-cancel"
                            onClick={() => setPendingDeleteId(null)}
                            disabled={deletingId === equipment.id}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="owner-delete-confirm-button"
                            onClick={() => void handleDeleteEquipment(equipment)}
                            disabled={deletingId === equipment.id}
                          >
                            {deletingId === equipment.id ? "Deleting..." : "Confirm delete"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="owner-delete-button"
                        onClick={() => setPendingDeleteId(equipment.id)}
                        disabled={deletingId !== null}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Delete machine
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="owner-list-actions">
            <button
              type="button"
              className="button-primary owner-upload-button"
              onClick={() => {
                setErrorMsg("");
                setSuccessMsg("");
                setIsCreating(true);
              }}
            >
              <PlusCircle size={18} /> Upload more equipment
            </button>
          </div>
        </div>
      ) : (
        <div className="owner-form-panel">
          <button
            type="button"
            className="owner-back-button"
            onClick={() => setIsCreating(false)}
          >
            Back to your machines
          </button>
      <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2 mb-6">
        <Tractor /> List Agricultural Equipment
      </h2>

      {successMsg && (
        <TimedNotice
          key={successMsg}
          message={successMsg}
          type="success"
          onDismiss={() => setSuccessMsg("")}
        />
      )}
      {errorMsg && (
        <TimedNotice
          key={errorMsg}
          message={errorMsg}
          type="error"
          onDismiss={() => setErrorMsg("")}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Equipment Name
            </label>
            <input
              type="text"
              maxLength={255}
              placeholder="e.g., John Deere Tractor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full border rounded p-2"
              required
            />
            <small className="form-character-count" aria-live="polite">
              {255 - name.length} characters remaining
            </small>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            >
              <option value="Tractor">Tractor</option>
              <option value="Plow">Plow / Disc Harrow</option>
              <option value="Planter">Planter / Seeder</option>
              <option value="Sprayer">Sprayer</option>
              <option value="Harvester">Harvester</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="equipment-images" className="block text-sm font-medium text-gray-700">
            Equipment Photos (up to 5, 5 MB each)
          </label>
          <input
            id="equipment-images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImageSelection}
            className="mt-1 w-full border rounded p-2"
          />
          {imagePreviews.length > 0 && (
            <div className="equipment-image-previews" aria-label="Selected equipment photo previews">
              {imagePreviews.map((preview, index) => (
                <div className="equipment-image-preview" key={preview}>
                  <img src={preview} alt={`Equipment preview ${index + 1}`} />
                  <button
                    type="button"
                    className="equipment-image-remove"
                    aria-label={`Remove equipment photo ${index + 1}`}
                    onClick={() =>
                      {
                        URL.revokeObjectURL(imagePreviews[index]);
                        const remainingPreviews = imagePreviews.filter(
                          (_, imageIndex) => imageIndex !== index,
                        );
                        imagePreviewsRef.current = remainingPreviews;
                        setImagePreviews(remainingPreviews);
                        setImages((current) =>
                          current.filter(
                            (_, imageIndex) => imageIndex !== index,
                          ),
                        );
                      }
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            placeholder="Details about condition, attachments included..."
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full border rounded p-2"
            rows={3}
          />
          <small className="form-character-count" aria-live="polite">
            {1000 - description.length} characters remaining
          </small>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Capacity / Specs
            </label>
            <input
              type="text"
              maxLength={255}
              placeholder="75 HP"
              value={capacitySpec}
              onChange={(e) => setCapacitySpec(e.target.value)}
              className="mt-1 w-full border rounded p-2"
            />
            <small className="form-character-count" aria-live="polite">
              {255 - capacitySpec.length} characters remaining
            </small>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Price per Acre (KES)
            </label>
            <input
              type="number"
              placeholder="2500"
              value={pricePerAcre}
              onChange={(e) => setPricePerAcre(e.target.value)}
              className="mt-1 w-full border rounded p-2"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="mt-1 w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="mt-1 w-full border rounded p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Service Radius (KM)
            </label>
            <input
              type="number"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(e.target.value)}
              className="mt-1 w-full border rounded p-2"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="button-primary w-full font-medium py-3 px-4 rounded transition flex items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          <PlusCircle size={18} /> {isSubmitting ? "Publishing..." : "Publish Listing"}
        </button>
      </form>
        </div>
      )}
      {selectedImage && (
        <div
          className="equipment-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Equipment photo viewer"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="equipment-image-lightbox-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="equipment-image-lightbox-toolbar">
              <span>{selectedImage.alt}</span>
              <div className="equipment-image-lightbox-controls">
                <button
                  type="button"
                  onClick={() => setImageZoom((zoom) => Math.max(1, zoom - 0.25))}
                  aria-label="Zoom out"
                  disabled={imageZoom <= 1}
                >
                  <Minus size={18} />
                </button>
                <span>{Math.round(imageZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setImageZoom((zoom) => Math.min(3, zoom + 0.25))}
                  aria-label="Zoom in"
                  disabled={imageZoom >= 3}
                >
                  <Plus size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom(1)}
                  aria-label="Reset zoom"
                >
                  <RotateCcw size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  aria-label="Close photo viewer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="equipment-image-lightbox-stage">
              <img
                src={selectedImage.url}
                alt={selectedImage.alt}
                style={
                  imageZoom === 1
                    ? undefined
                    : {
                        width: `${imageZoom * 100}%`,
                        maxWidth: "none",
                        maxHeight: "none",
                      }
                }
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
