# AI & Machine Learning Methodology

This document details the mathematical formulations, machine learning architectures, and signal processing pipelines implemented for **Visual Engagement Estimation** and **NLP Chat Moderation**.

---

## 1. Visual Engagement Estimation Pipeline

Visual engagement is quantified using an observable, non-invasive heuristic that operates strictly in client-side RAM (`faceTracker.js` / Python CV service).

### 1.1 The Mathematical Scoring Formulation

The composite engagement score $S_{\text{overall}} \in [0, 100]$ is computed as a weighted linear combination of three normalized observable signals:

$$S_{\text{overall}} = w_{\text{head}} \cdot S_{\text{head}} + w_{\text{eye}} \cdot S_{\text{eye}} + w_{\text{presence}} \cdot S_{\text{presence}}$$

Where the empirically validated weights are:
- $w_{\text{head}} = 0.50$ (Head orientation and camera alignment)
- $w_{\text{eye}} = 0.35$ (Eye aspect ratio & gaze stability)
- $w_{\text{presence}} = 0.15$ (Binary face detection and lighting confidence)

$$\sum w_i = 0.50 + 0.35 + 0.15 = 1.00$$

---

### 1.2 Mathematical Derivations of Component Signals

#### 1. Head Pose Score ($S_{\text{head}}$)
Head orientation is derived via geometric projection of facial landmark coordinates into 3D Euler angles:
- $\psi$ (Yaw: horizontal rotation left/right)
- $\theta$ (Pitch: vertical tilt up/down)
- $\phi$ (Roll: lateral head tilt)

Let deviation angle $\Delta = \sqrt{\psi^2 + \theta^2}$. The normalized head pose score is defined as:

$$S_{\text{head}} = \begin{cases} 
100 & \text{if } \Delta \le 12^\circ \\
100 \cdot \left(1 - \frac{\Delta - 12}{35 - 12}\right) & \text{if } 12^\circ < \Delta < 35^\circ \\
0 & \text{if } \Delta \ge 35^\circ 
\end{cases}$$

- If $\Delta > 28^\circ$, a boolean `distractionFlag = true` is raised.
- If $\theta < -20^\circ$, `headPoseState` is categorized as `head_down`.

#### 2. Eye Gaze & Aspect Ratio Score ($S_{\text{eye}}$)
The Eye Aspect Ratio (EAR) measures ocular aperture to differentiate natural blinks from prolonged eye closure:

$$\text{EAR} = \frac{\|p_2 - p_6\| + \|p_3 - p_5\|}{2 \cdot \|p_1 - p_4\|}$$

Where $p_1 \dots p_6$ are standard 2D eye landmark points.
- Normal open eyes: $\text{EAR} \approx 0.28 - 0.35 \implies S_{\text{eye}} \approx 90 - 100$.
- Normal blink duration: $150\text{ms} - 300\text{ms}$ (temporally smoothed to avoid penalizing blinks).
- Prolonged closure ($>1.5\text{s}$): $S_{\text{eye}} \le 20 \implies \text{facialState} = \text{'fatigued'}$.

#### 3. Face Presence & Data Quality ($S_{\text{presence}}$)
- If face detected with luminance variance $\ge 18$: $S_{\text{presence}} = 100$.
- Low-light condition (average pixel luminance $< 30$): $S_{\text{presence}} = 50$, with diagnostic note `"Low-light condition detected"`.
- No face detected: Telemetry pipeline outputs $S_{\text{overall}} = 0$, $\text{facialState} = \text{'absent'}$, and flags data quality as insufficient.

---

## 2. Natural Language Processing (NLP) Moderation Pipeline

Classroom chat messages are classified in real-time by a machine learning pipeline deployed within the Python FastAPI microservice (`ai-service/app/services/moderation_service.py`).

### 2.1 Model Architecture

```mermaid
graph LR
    A["Raw Chat Message Text"] --> B["Pre-processing & Lowercasing"]
    B --> C["TfidfVectorizer (Sublinear TF, 1-2 N-grams)"]
    C --> D["Feature Matrix (5000+ Dims)"]
    D --> E["Logistic Regression Multi-Class Classifier"]
    E --> F["Calibrated Probability Distribution"]
    F --> G["Category & Severity Decision Engine"]
```

1. **Feature Extraction:**
   - **Vectorizer:** `TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, stop_words='english')`.
   - Captures both isolated offensive tokens and contextual unigram-bigram pairings (e.g. `"shut up"`, `"hate you"`).
2. **Classification Model:**
   - **Algorithm:** `LogisticRegression(C=2.5, solver='lbfgs', max_iter=300)`.
   - Trained across six academic classroom taxonomy classes:
     - `clean` (Normal questions, academic discussion)
     - `toxic` (Hostile, demeaning language)
     - `insult` (Targeted personal attacks, name-calling)
     - `threat` (Direct physical or disciplinary threats)
     - `harassment` (Bullying and repetitive targeting)
     - `profanity` (Vulgar slang or inappropriate expletives)

---

### 2.2 Confidence Calibration & Severity Mapping

The classifier computes continuous softmax posterior probabilities:

$$P(C_k \mid x) = \frac{e^{z_k}}{\sum_{j} e^{z_j}}$$

A message is flagged if $\max_{k \ne \text{clean}} P(C_k \mid x) \ge 0.50$. Severity is dynamically assigned:

| Predicted Category | Confidence Range | Assigned Severity | Action Triggered |
|---|---|---|---|
| **threat** | $\ge 0.50$ | `critical` | Immediate instructor priority alert; potential auto-mute |
| **harassment** | $\ge 0.60$ | `high` | Moderation event queued; reviewed in instructor hub |
| **insult / toxic** | $\ge 0.50$ | `medium` | Flagged event persisted; message sanitized with asterisks |
| **profanity** | $\ge 0.50$ | `low` | Flagged event persisted; sanitized for peers |
| **clean** | $> 0.50$ | `none` | Clean broadcast; zero moderation overhead |

---

### 2.3 Real-Time Text Sanitization

When a message is flagged, offensive token spans are substituted with cryptographic asterisks (`***`) while preserving grammatical sentence context for peer chat displays.

---

## 3. Evaluation Methodology & Model Limitations

1. **Academic Honesty:** This system makes no claim to detect internal neurological focus, cognitive comprehension, or hidden motives.
2. **Sarcasm & Idiomatic Speech:** Like all standard NLP models, figurative sarcasm (e.g., *"Oh brilliant, another compiler error"*) may occasionally produce false-positive toxicity alerts.
3. **Multilingual Limitations:** The current baseline model is trained predominantly on English classroom discourse. Non-English vulgarity requires localized language tokenizers.
4. **Camera Angle Variance:** Laptops positioned at oblique angles on standing desks or multiple monitor setups will naturally exhibit higher yaw deviations. Instructors are trained via system guidelines to account for this context.
