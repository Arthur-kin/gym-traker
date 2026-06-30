# Gymformer User Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a User Profile feature (storing height, weight, birthday, experience, fitness goals) and integrate it with the AI coach so that suggestions are personalized (BMI calculation, calorie estimates, tailored advice).

**Architecture:** Create a `UserProfile` table in PostgreSQL via Prisma, implement GET/PUT REST endpoints on the backend server, hook these profile metrics into Gemini's system prompts/monthly report context, and render a high-quality profile settings modal in the frontend Navbar.

**Tech Stack:** React, TypeScript, Express, Prisma, PostgreSQL, Google Generative AI SDK, Docker

---

### Task 1: Database Migration & Backend Profile API

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Add UserProfile model to prisma schema**

In [backend/prisma/schema.prisma](file:///opt/gym-tracker/backend/prisma/schema.prisma), add the `UserProfile` model at the bottom of the file:

```prisma
// 使用者基本特徵檔案
model UserProfile {
  id          String   @id @default(uuid())
  height      Float?   // 身高 (cm)
  weight      Float?   // 體重 (kg)
  birthdate   String?  // 生日 (格式: YYYY-MM-DD)
  experience  String?  // 經驗: BEGINNER, INTERMEDIATE, ADVANCED
  fitnessGoal String?  // 目標: LOSE_FAT, BUILD_MUSCLE, MAINTENANCE
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 2: Generate Prisma Client and apply database schema update**

Run: `npm run prisma:generate && npm run prisma:migrate` in the `/opt/gym-tracker/backend` directory.
Expected: Client generated and schema pushed to running PostgreSQL database.

- [ ] **Step 3: Add GET and PUT endpoints for UserProfile in server.ts**

In [backend/src/server.ts](file:///opt/gym-tracker/backend/src/server.ts), add the `/api/profile` routes. Define interfaces for request parameters.

Add routes above the layout routes (around lines 110-120):
```typescript
interface UpdateProfilePayload {
  height?: number | null;
  weight?: number | null;
  birthdate?: string | null;
  experience?: string | null;
  fitnessGoal?: string | null;
}

// GET /api/profile - 獲取唯一一筆個人設定（若不存在則自動創建）
app.get('/api/profile', async (req: Request, res: Response) => {
  try {
    let profile = await prisma.userProfile.findFirst();
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {}
      });
    }
    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/profile - 更新個人設定
app.put('/api/profile', async (req: Request, res: Response) => {
  try {
    const { height, weight, birthdate, experience, fitnessGoal } = req.body as UpdateProfilePayload;

    if (height !== undefined && height !== null && (typeof height !== 'number' || height <= 0)) {
      return res.status(400).json({ error: 'Height must be a positive number' });
    }
    if (weight !== undefined && weight !== null && (typeof weight !== 'number' || weight <= 0)) {
      return res.status(400).json({ error: 'Weight must be a positive number' });
    }

    const validExp = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', null, ''];
    if (experience !== undefined && experience !== null && !validExp.includes(experience)) {
      return res.status(400).json({ error: 'Invalid experience level' });
    }

    const validGoals = ['LOSE_FAT', 'BUILD_MUSCLE', 'MAINTENANCE', null, ''];
    if (fitnessGoal !== undefined && fitnessGoal !== null && !validGoals.includes(fitnessGoal)) {
      return res.status(400).json({ error: 'Invalid fitness goal' });
    }

    let profile = await prisma.userProfile.findFirst();
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {}
      });
    }

    const updated = await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        height,
        weight,
        birthdate,
        experience,
        fitnessGoal
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});
```

- [ ] **Step 4: Verify backend compilation**

Run: `npm run build` in the `/opt/gym-tracker/backend` directory.
Expected: Completes successfully with exit code 0.

- [ ] **Step 5: Commit backend profile API changes**

Run:
```bash
git add backend/prisma/schema.prisma backend/src/server.ts
git commit -m "feat(backend): add UserProfile model and GET/PUT /api/profile endpoints"
```

---

### Task 2: AI Coach Context Integration

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Inject user profile context into monthly/all-time report prompts**

In [backend/src/server.ts](file:///opt/gym-tracker/backend/src/server.ts), retrieve the user profile inside the `POST /api/logs/monthly-analysis` handler and inject a formatted profile description into the AI prompt template.

Modify around lines 270-300:
```typescript
        // Retrieve profile details
        const profile = await prisma.userProfile.findFirst();
        let ageStr = '未設定';
        if (profile?.birthdate) {
          const birth = new Date(profile.birthdate);
          const now = new Date();
          let age = now.getFullYear() - birth.getFullYear();
          const m = now.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
            age--;
          }
          ageStr = `${age} 歲`;
        }

        const profileContext = profile 
          ? `生理特徵背景資訊：
             - 身高：${profile.height ? `${profile.height} cm` : '未提供'}
             - 體重：${profile.weight ? `${profile.weight} kg` : '未提供'}
             - 年齡：${ageStr}
             - 健身經驗階段：${profile.experience || '未提供'}
             - 當前健身目標：${profile.fitnessGoal || '未提供'}`
          : '';
```
And append `profileContext` to both the Monthly prompt and the All-Time prompt, instructing the coach:
`"請特別考慮使用者的生理背景資訊來客製化報告建議。"`

- [ ] **Step 2: Inject user profile context into stateless AI Chat sessions**

In [backend/src/server.ts](file:///opt/gym-tracker/backend/src/server.ts), retrieve the user profile inside the `POST /api/logs/monthly-analysis/chat` handler and append the `profileContext` string to the `systemInstruction` config.

Modify around lines 370-390:
```typescript
    const profile = await prisma.userProfile.findFirst();
    let ageStr = '未設定';
    if (profile?.birthdate) {
      const birth = new Date(profile.birthdate);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      ageStr = `${age} 歲`;
    }

    const profileContext = profile 
      ? `生理特徵背景資訊：
         - 身高：${profile.height ? `${profile.height} cm` : '未提供'}
         - 體重：${profile.weight ? `${profile.weight} kg` : '未提供'}
         - 年齡：${ageStr}
         - 健身經驗階段：${profile.experience || '未提供'}
         - 當前健身目標：${profile.fitnessGoal || '未提供'}`
      : '';

    const systemInstruction = `You are a professional fitness personal trainer. You are chatting with a client...
    
    Here is their profile context:
    ${profileContext}
    
    Guidelines:
    1. Tailor all advice, recommendations, and corrections to their profile (e.g. adjust goals, training volume, energy intake based on height/weight/experience).
    ...`;
```

- [ ] **Step 3: Verify backend compilation**

Run: `npm run build` in the `/opt/gym-tracker/backend` directory.
Expected: Completes successfully with exit code 0.

- [ ] **Step 4: Commit AI integration changes**

Run:
```bash
git add backend/src/server.ts
git commit -m "feat(backend): integrate UserProfile context into AI Coach reports and chat instructions"
```

---

### Task 3: Frontend Profile Modal Component

**Files:**
- Create: `frontend/src/components/ProfileModal.tsx`

- [ ] **Step 1: Create ProfileModal component file**

Create [frontend/src/components/ProfileModal.tsx](file:///opt/gym-tracker/frontend/src/components/ProfileModal.tsx) to render the form and calculate BMI.

```tsx
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

export interface UserProfileData {
  height?: number | null;
  weight?: number | null;
  birthdate?: string | null;
  experience?: string | null;
  fitnessGoal?: string | null;
}

interface ProfileModalProps {
  profile: UserProfileData | null;
  onClose: () => void;
  onSave: (data: UserProfileData) => Promise<boolean>;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ profile, onClose, onSave }) => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [experience, setExperience] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setHeight(profile.height?.toString() || '');
      setWeight(profile.weight?.toString() || '');
      setBirthdate(profile.birthdate || '');
      setExperience(profile.experience || '');
      setFitnessGoal(profile.fitnessGoal || '');
    }
  }, [profile]);

  // Live BMI calculator
  const hNum = parseFloat(height);
  const wNum = parseFloat(weight);
  const bmi = hNum > 0 && wNum > 0 ? wNum / ((hNum / 100) * (hNum / 100)) : null;

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { text: '體重過輕 (Underweight)', color: '#60a5fa' };
    if (val < 24.0) return { text: '正常範圍 (Normal)', color: '#34d399' };
    if (val < 27.0) return { text: '體重過重 (Overweight)', color: '#fbbf24' };
    return { text: '肥胖等級 (Obese)', color: '#f87171' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = height.trim() ? parseFloat(height) : null;
    const w = weight.trim() ? parseFloat(weight) : null;

    if (h !== null && (isNaN(h) || h <= 0)) {
      alert('請輸入有效身高');
      return;
    }
    if (w !== null && (isNaN(w) || w <= 0)) {
      alert('請輸入有效體重');
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
      alert('儲存失敗，請檢查網路連線。');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">👤 個人資料設定</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>身高 (cm)</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  className="equipment-search"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px' }}
                  placeholder="例如: 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>體重 (kg)</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  className="equipment-search"
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px' }}
                  placeholder="例如: 70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>出生日期</label>
              <input
                type="date"
                className="equipment-search"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px', cursor: 'pointer' }}
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>健身經驗階段</label>
              <select
                className="equipment-search"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px', cursor: 'pointer' }}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="">選擇您的經驗階段</option>
                <option value="BEGINNER">新手階段 (Beginner)</option>
                <option value="INTERMEDIATE">中階精進 (Intermediate)</option>
                <option value="ADVANCED">高階強人 (Advanced)</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted-dark)', marginBottom: '4px' }}>健身目標</label>
              <select
                className="equipment-search"
                style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dark)', border: '1px solid var(--border-gold)', padding: '8px', cursor: 'pointer' }}
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
              >
                <option value="">選擇健身主軸</option>
                <option value="LOSE_FAT">減脂降重 (Lose Fat)</option>
                <option value="BUILD_MUSCLE">增肌雕塑 (Build Muscle)</option>
                <option value="MAINTENANCE">健康體態維持 (Maintenance)</option>
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
                  <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>即時 BMI: </span>
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
              {isSubmitting ? '儲存中...' : '儲存個人資料 (Save Settings)'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
```

- [ ] **Step 2: Commit ProfileModal file**

Run:
```bash
git add frontend/src/components/ProfileModal.tsx
git commit -m "feat(frontend): create ProfileModal user settings form component"
```

---

### Task 4: App.tsx Nav Button and State Synchronization

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add profile state, fetch on startup, and save callback**

In [frontend/src/App.tsx](file:///opt/gym-tracker/frontend/src/App.tsx), import `ProfileModal` and `UserProfileData`. Add a state hook `userProfile` and `showProfileModal`.
Fetch the user profile inside the startup `useEffect`. Implement the `handleSaveProfile` callback.

Modify imports at top of `App.tsx`:
```typescript
import ProfileModal, { UserProfileData } from './components/ProfileModal';
```

Add state variables around lines 47-51:
```typescript
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
```

Fetch profile inside the startup `useEffect` (around line 60):
```typescript
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const profileData = await res.json();
          setUserProfile(profileData);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
```

Implement `handleSaveProfile` callback below other callbacks:
```typescript
  const handleSaveProfile = async (profileData: UserProfileData) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        const updated = await res.json();
        setUserProfile(updated);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save profile:', err);
      return false;
    }
  };
```

- [ ] **Step 2: Render Profile button in Navbar**

In [frontend/src/App.tsx](file:///opt/gym-tracker/frontend/src/App.tsx), render the Profile button in the top navigation panel next to theme/tab triggers (around lines 220-250).

Modify Navbar UI:
```tsx
          <button
            onClick={() => setShowProfileModal(true)}
            className="tab-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--border-gold)',
              color: 'var(--gold-primary)',
              marginLeft: '8px'
            }}
            title="編輯個人資料"
          >
            <span>👤</span>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>個人資料</span>
          </button>
```

Render the `ProfileModal` conditionally:
```tsx
      {showProfileModal && (
        <ProfileModal
          profile={userProfile}
          onClose={() => setShowProfileModal(false)}
          onSave={handleSaveProfile}
        />
      )}
```

- [ ] **Step 3: Verify frontend compilation**

Run: `npm run build` in the `/opt/gym-tracker/frontend` directory.
Expected: Completes successfully with exit code 0.

- [ ] **Step 4: Commit App.tsx profile changes**

Run:
```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): integrate ProfileModal button and state handler in App.tsx"
```

---

### Task 5: Rebuild Containers and Verification

**Files:**
- None (testing/deployment)

- [ ] **Step 1: Rebuild and restart services via Docker Compose**

Run: `docker compose up -d --build` in the `/opt/gym-tracker` directory.
Expected: Both containers rebuilt and started successfully.

- [ ] **Step 2: End-to-end verification**

1. Open the gym-tracker app and click the "👤 個人資料" button in the navbar.
2. Enter values: Height = 180, Weight = 75, Select Birthdate, experience = BEGINNER, goal = BUILD_MUSCLE.
3. Observe live BMI calculates `23.1` (正常範圍).
4. Save the profile and verify that reloading the page persists your settings.
5. Generate a Monthly report or chat with the AI Coach, and confirm the AI responds referencing your body profile (e.g. mentioning you are a Beginner, height/weight, or target BMI advice).
