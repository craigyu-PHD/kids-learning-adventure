#!/usr/bin/env python3
"""Tracked local browser seed shared by the V6.3 Shop release gates."""
import json

SETTINGS = {
    'theme': 'light', 'visualTheme': 'hero', 'voicePreference': 'female', 'voiceRate': 0.78,
    'semesterStart': '2026-08-31',
    'users': [
        {'id': 'user-father', 'name': '爸爸', 'role': 'father', 'disabled': False},
        {'id': 'user-mother', 'name': '媽媽', 'role': 'mother', 'disabled': False},
    ],
    'children': [
        {'id': 'child-1', 'name': '哥哥', 'avatar': 'brother', 'role': 'child', 'disabled': False},
        {'id': 'child-2', 'name': '弟弟', 'avatar': 'younger', 'role': 'child', 'disabled': False},
        {'id': 'child-3', 'name': '姐姐', 'avatar': 'sister', 'role': 'child', 'disabled': False},
        {'id': 'child-4', 'name': '妹妹', 'avatar': 'younger-sister', 'role': 'child', 'disabled': False},
    ],
    'cloudSync': {'enabled': False, 'familyCode': ''},
}


def empty_progress(index: int):
    return {
        'completedDays': [], 'completedBlocks': [], 'completedMissions': [], 'claimedEggs': [],
        'unlockedCosmetics': [], 'equippedCosmetics': [], 'badgeUnlocks': {}, 'completionTimestamps': {},
        'rewardTransactions': [{
            'id': f'v63-audit-seed-coins-{index}', 'kind': 'bonus', 'sourceId': 'v63-production-audit-local-seed',
            'xp': 1500, 'coins': 1500, 'stars': 0, 'gems': 0, 'createdAt': '2026-09-02T00:00:00.000Z',
        }],
        'answerEvents': [],
    }


PROGRESS = {f'child-{index}': empty_progress(index) for index in range(1, 5)}

SEED_SCRIPT = f"""
(() => {{
  if (localStorage.getItem('__v63_release_audit_seeded__') === '1') return;
  const settings = {json.dumps(SETTINGS, ensure_ascii=False)};
  const progress = {json.dumps(PROGRESS, ensure_ascii=False)};
  localStorage.removeItem('star-learning-active-family-session-v40');
  localStorage.setItem('star-learning-v40:__local__:settings', JSON.stringify(settings));
  localStorage.setItem('star-learning-v40:__local__:progress', JSON.stringify(progress));
  localStorage.setItem('star-learning-v40:__local__:attendance', JSON.stringify({{}}));
  localStorage.setItem('star-learning-v40:__local__:reflections', JSON.stringify({{}}));
  sessionStorage.setItem('star-learning-v40:__local__:active-user', 'user-father');
  localStorage.setItem('little-explorers-v4-sound', 'off');
  localStorage.setItem('__v63_release_audit_seeded__', '1');
}})();
"""
