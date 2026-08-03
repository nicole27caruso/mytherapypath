import requests
BASE='http://127.0.0.1:8000/v1'
print('Fetching existing exercise templates...')
r=requests.get(BASE+'/templates')
r.raise_for_status()
existing=r.json()
by_title={t['title'].lower():t for t in existing}
# exercises to ensure exist
needed_exercises=[
  ('Median Nerve Glide','Perform median nerve gliding motions through wrist flexion and extension while keeping the thumb relaxed.',8),
  ('Wrist Neutral Hold','Hold the wrist in a neutral position for 30 seconds, focusing on relaxed fingers and thumb.',1),
  ('Scapular Retraction','Pull shoulder blades gently together and down, holding for 5 seconds. Repeat 10 times.',6),
  ('Pendulum Circles','Lean forward, allow the arm to hang, and gently move it in small circular motions.',7),
  ('Gentle Shoulder ER','Perform gentle external rotation with the elbow at the side using a light band.',7),
  ('Wrist Extension Stretch','Extend the wrist gently with the opposite hand, feeling a mild stretch along the forearm.',5),
  ('Thumb Opposition Practice','Oppose the thumb to each fingertip slowly, repeating 10 times on each hand.',6),
  ('Grip Pinch Progression','Squeeze small objects with a precise pinch grip, gradually increasing size and resistance.',8),
]
created_ids={}
for title, instr, minutes in needed_exercises:
    key=title.lower()
    if key in by_title:
        created_ids[title]=by_title[key]['id']
        print('Already exists:', title)
    else:
        print('Creating exercise template:', title)
        payload={'title':title,'instructions':instr,'duration_minutes':minutes}
        rr=requests.post(BASE+'/templates',json=payload)
        if rr.status_code>=400:
            print('Failed to create', title, rr.status_code, rr.text)
        else:
            t=rr.json()
            created_ids[title]=t['id']
# refresh mapping
r=requests.get(BASE+'/templates'); r.raise_for_status(); existing=r.json(); by_title={t['title'].lower():t for t in existing}
# helper to get id by title
def id_of(title):
    return by_title.get(title.lower(), {}).get('id')

# Define program templates
programs=[
  {
    'title':'Carpal Tunnel Management',
    'description':'Median nerve glides, neutral wrist support, and progressive pinch/grip for managing carpal tunnel symptoms.',
    'category':'Upper extremity','body_region':'Wrist / Hand','injury_type':'Carpal Tunnel Syndrome','functional_focus':'Nerve mobility, wrist control, grip/pinch strength',
    'recovery_phase':'Subacute','goals':'Reduce numbness, improve nerve mobility and pinch function.','ergonomic_recommendations':'Keyboard/mouse positioning, wrist supports, microbreaks.','precautions':'Avoid symptom-provoking sustained flexion or forceful grip.','equipment_needed':'Theraband, wrist splint, small therapy ball','progression_criteria':'Reduced paresthesia and improved endurance in neutral posture','frequency_per_week':4,
    'template_ids':[ id_of('Median Nerve Glide') or created_ids.get('Median Nerve Glide'), id_of('Wrist Neutral Hold') or created_ids.get('Wrist Neutral Hold'), id_of('Thumb Opposition Practice') or created_ids.get('Thumb Opposition Practice'), id_of('Grip Pinch Progression') or created_ids.get('Grip Pinch Progression') ]
  },
  {
    'title':'Rotator Cuff and Shoulder Rehab',
    'description':'Scapular control, gentle ROM, and progressive external rotation for rotator cuff tendinopathy.',
    'category':'Shoulder','body_region':'Shoulder','injury_type':'Rotator Cuff Tendinopathy','functional_focus':'Scapular stability, pain-free ROM','recovery_phase':'Subacute','goals':'Restore pain-free shoulder motion and scapular control.','ergonomic_recommendations':'Avoid repeated overhead reaching','precautions':'Stop if sharp pain increases','equipment_needed':'Light resistance band','progression_criteria':'Improved overhead reach and scapular hold','frequency_per_week':4,
    'template_ids':[ id_of('Pendulum Circles') or created_ids.get('Pendulum Circles'), id_of('Scapular Retraction') or created_ids.get('Scapular Retraction'), id_of('Gentle Shoulder ER') or created_ids.get('Gentle Shoulder ER'), id_of('Passive ROM') ]
  },
  {
    'title':'Distal Radius Fracture Rehab',
    'description':'Protected wrist ROM, edema management and progressive grip reactivation after distal radius fracture.',
    'category':'Wrist / Hand','body_region':'Wrist / Hand','injury_type':'Distal Radius Fracture','functional_focus':'Protected ROM, grip strength','recovery_phase':'Remodeling','goals':'Restore safe wrist motion and controlled grip.','ergonomic_recommendations':'Use built-up handles and avoid heavy lifting early','precautions':'Respect surgeon limits','equipment_needed':'Therapy putty, lightweight grip trainer','progression_criteria':'Tolerates gentle motion without increased swelling','frequency_per_week':4,
    'template_ids':[ id_of('Wrist Rotation'), id_of('Wrist Extension Stretch') or created_ids.get('Wrist Extension Stretch'), id_of('Grip Pinch Progression') or created_ids.get('Grip Pinch Progression') ]
  },
  {
    'title':'Thumb Osteoarthritis Management',
    'description':'Thumb opposition, pinch work and joint protection strategies to manage thumb OA.',
    'category':'Hand','body_region':'Thumb / Hand','injury_type':'Thumb Osteoarthritis','functional_focus':'Thumb opposition, pinch strength, joint protection','recovery_phase':'Conservative management','goals':'Reduce pain during pinch tasks and improve functional use of the thumb.','ergonomic_recommendations':'Use adaptive tools, avoid pinch-heavy tasks during flare','precautions':'Avoid painful resistive pinch during flare-ups','equipment_needed':'Thumb splint, soft putty','progression_criteria':'Improved pinch strength and reduced pain','frequency_per_week':3,
    'template_ids':[ id_of('Thumb Opposition Practice') or created_ids.get('Thumb Opposition Practice'), id_of('Pinch and Release'), id_of('Grip Pinch Progression') or created_ids.get('Grip Pinch Progression') ]
  },
  {
    'title':'Post-Stroke Upper Limb Program',
    'description':'Mirror therapy, graded active assist and ball squeeze progression for hemiparesis recovery.',
    'category':'Neuro','body_region':'Upper Limb','injury_type':'Post-stroke hemiparesis','functional_focus':'Motor re-learning, strength, task-specific practice','recovery_phase':'Subacute to chronic','goals':'Increase active use, reduce learned nonuse and improve graded strength','ergonomic_recommendations':'Task simplification, use unaffected limb for bilateral tasks','precautions':'Avoid fatigue-driven compensatory movements','equipment_needed':'Mirror box, therapy ball','progression_criteria':'Increased active repetitions with improved form','frequency_per_week':5,
    'template_ids':[ id_of('Mirror Therapy'), id_of('Passive ROM'), id_of('Ball Squeeze Series') ]
  },
  {
    'title':'Workstation Ergonomics & Microbreaks',
    'description':'Short microbreak exercises and ergonomic recommendations to reduce upper quadrant strain for desk workers.',
    'category':'Ergonomics','body_region':'Neck / Shoulder / Wrist','injury_type':'Repetitive strain/overuse','functional_focus':'Posture, microbreaks, nerve mobility','recovery_phase':'Prevention/management','goals':'Reduce symptom provocation during desk tasks and improve posture awareness','ergonomic_recommendations':'Adjust keyboard/mouse height, neutral wrist, frequent breaks','precautions':'Avoid provocative sustained postures','equipment_needed':'Wrist support, lumbar roll','progression_criteria':'Reduced symptom frequency and longer pain-free intervals','frequency_per_week':7,
    'template_ids':[ id_of('Wrist Neutral Hold') or created_ids.get('Wrist Neutral Hold'), id_of('Median Nerve Glide') or created_ids.get('Median Nerve Glide'), id_of('Wrist Rotation') ]
  }
]
# Create program templates
for p in programs:
    print('Creating program template:', p['title'])
    rr=requests.post(BASE+'/program-templates',json={
        'title':p['title'],'description':p['description'],'category':p['category'],'body_region':p['body_region'],'injury_type':p['injury_type'],'functional_focus':p.get('functional_focus'),
        'recovery_phase':p.get('recovery_phase'),'goals':p.get('goals'),'ergonomic_recommendations':p.get('ergonomic_recommendations'),'precautions':p.get('precautions'),'equipment_needed':p.get('equipment_needed'),'progression_criteria':p.get('progression_criteria'),'frequency_per_week':p.get('frequency_per_week'),'schedule_days':None,'template_ids':p['template_ids']
    })
    try:
        rr.raise_for_status()
        print('Created:', rr.json()['id'])
    except Exception as e:
        print('Failed:', rr.status_code, rr.text)
print('Done')