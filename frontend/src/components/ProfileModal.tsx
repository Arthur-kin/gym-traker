import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useToast } from './Toast';

// Explicit Union Types for stricter type-safety
export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type FitnessGoal = 'LOSE_FAT' | 'BUILD_MUSCLE' | 'MAINTENANCE';

export interface UserProfileData {
  id?: string;
  height?: number | null;
  weight?: number | null;
  birthdate?: string | null;
  experience?: ExperienceLevel | null;
  fitnessGoal?: FitnessGoal | null;
}

interface ProfileModalProps {
  profile: UserProfileData | null;
  onClose: () => void;
  onSave: (data: UserProfileData) => Promise<boolean>;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onClose, onSave }) => {
  const { showToast } = useToast();
  // Initialize state directly from profile to reduce double renders on mount
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  const [weight, setWeight] = useState(profile?.weight?.toString() || '');
  const [birthdate, setBirthdate] = useState(profile?.birthdate || '');
  const [experience, setExperience] = useState<ExperienceLevel | ''>(profile?.experience || '');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | ''>(profile?.fitnessGoal || '');
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Accessibility: Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Live BMI calculator
  const hNum = parseFloat(height);
  const wNum = parseFloat(weight);
  const bmi = hNum > 0 && wNum > 0 ? wNum / ((hNum / 100) * (hNum / 100)) : null;

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { text: 'Underweight', color: '#60a5fa' };
    if (val < 24.0) return { text: 'Normal', color: '#34d399' };
    if (val < 27.0) return { text: 'Overweight', color: '#fbbf24' };
    return { text: 'Obese', color: '#f87171' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = height.trim() ? parseFloat(height) : null;
    const w = weight.trim() ? parseFloat(weight) : null;

    // Boundary constraints check
    if (h !== null && (isNaN(h) || h < 30 || h > 300)) {
      showToast('Please enter a valid height (30-300 cm)', 'error');
      return;
    }
    if (w !== null && (isNaN(w) || w < 2 || w > 500)) {
      showToast('Please enter a valid weight (2-500 kg)', 'error');
      return;
    }

    setIsSubmitting(true);
    const success = await onSave({
      height: h,
      weight: w,
      birthdate: birthdate || null,
      experience: experience || null,
      fitnessGoal: fitnessGoal || null
    });
    setIsSubmitting(false);
    if (success) {
      onClose();
    } else {
      showToast('Save failed. Please check your connection.', 'error');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '420px' }} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <h3 id="profile-modal-title" className="modal-title">Profile Settings</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal" type="button">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label htmlFor="profile-height" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>Height (cm)</label>
                <input
                  id="profile-height"
                  type="number"
                  step="any"
                  min="30"
                  max="300"
                  className="equipment-search"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                  placeholder="e.g. 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="profile-weight" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>Weight (kg)</label>
                <input
                  id="profile-weight"
                  type="number"
                  step="any"
                  min="2"
                  max="500"
                  className="equipment-search"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                  placeholder="e.g. 70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="profile-birthdate" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>Birthdate</label>
              <input
                id="profile-birthdate"
                type="date"
                max={todayStr}
                className="equipment-search"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label htmlFor="profile-experience" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>Experience Level</label>
              <select
                id="profile-experience"
                className="equipment-search"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
                value={experience}
                onChange={(e) => setExperience(e.target.value as ExperienceLevel | '')}
              >
                <option value="">Select your level</option>
                <option value="BEGINNER">Beginner (新手)</option>
                <option value="INTERMEDIATE">Intermediate (中階)</option>
                <option value="ADVANCED">Advanced (高階)</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="profile-goal" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>Fitness Goal</label>
              <select
                id="profile-goal"
                className="equipment-search"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value as FitnessGoal | '')}
              >
                <option value="">Select your goal</option>
                <option value="LOSE_FAT">Lose Fat (減脂)</option>
                <option value="BUILD_MUSCLE">Build Muscle (增肌)</option>
                <option value="MAINTENANCE">Maintenance (體態維持)</option>
              </select>
            </div>

            {/* BMI Live Output */}
            {bmi !== null && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                border: '1px solid rgba(203, 161, 84, 0.15)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Live BMI: </span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gold-dark)' }}>{bmi.toFixed(1)}</span>
                </div>
                <div style={{ color: getBmiCategory(bmi).color, fontWeight: 600, fontSize: '12px' }}>
                  {getBmiCategory(bmi).text}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn-gold"
              style={{ width: '100%', padding: '12px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={isSubmitting}
            >
              <Save size={16} />
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
