import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, Pressable, ScrollView, FlatList, StyleSheet, Switch,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Alert, Share, Image, StatusBar,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

// Shown before the server list loads, and as starter ideas for each activity.
const SUGGESTIONS = {
  master: ['Plan my day', 'Explain something simply', 'Help me decide between two options'],
  study: ['Explain photosynthesis simply', 'Make a 10-question quiz on fractions', 'Solve: 2x + 5 = 17 step by step'],
  writing: ['Write a leave letter to my manager', 'Fix the grammar in my paragraph', 'Write an Instagram caption for a sunset'],
  communications: ['Reply politely to a late-payment customer', 'Write a birthday wish for my friend', 'Draft a professional follow-up email'],
  translate: ['Translate "How are you?" to Hindi and Telugu', 'Teach me 10 Arabic phrases for travel', 'Translate my message to English'],
  developer: ['Write a Python script to rename files', 'Explain this error message', 'How do I build a simple website?'],
  business: ['Give me 5 small business ideas with low investment', 'Make a monthly sales report template', 'Excel formula for profit margin'],
  finance: ['Make a monthly budget for ₹30,000 salary', 'Calculate EMI for ₹5 lakh at 9% for 3 years', 'How to start saving money?'],
  health: ['Make a 20-minute home workout', 'Healthy vegetarian diet plan for a week', 'Tips to sleep better'],
  cooking: ['What can I cook with rice, eggs and onion?', 'Chicken biryani recipe for 4 people', 'Weekly meal plan with shopping list'],
  travel: ['3-day Goa trip plan on a budget', 'Packing list for a winter trip', 'Things to do in Hyderabad'],
  planner: ['Make a study timetable for exams', 'Build a morning routine', 'Turn my goals into a weekly plan'],
  career: ['Practice a job interview with me', 'Improve my resume summary', 'Roadmap to become a data analyst'],
  research: ['Compare electric vs petrol scooters', 'Explain how AI works', 'Pros and cons of remote work'],
  shopping: ['Best features to look for in a phone under ₹20,000', 'Compare two laptops for me', 'Write a product description'],
  graphics: ['Logo ideas for a tea shop', 'Colour palette for a fitness brand', 'Image prompt for a festival poster'],
  phone: ['How to free up storage on Android', 'My phone battery drains fast — help', 'How to back up WhatsApp chats'],
  screen: ['📷 Tap the camera button and ask about any photo', 'Read the text in a picture', 'Solve the homework in my photo'],
};
const FALLBACK = [{ id: 'master', name: 'General Assistant', icon: '✨', enabled: true }];

export default function App() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [setupMode, setSetupMode] = useState(false);
  const [agents, setAgents] = useState(FALLBACK);
  const [activity, setActivity] = useState('master');
  const [chats, setChats] = useState({});
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null); // { uri, dataUrl }
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [mode, setMode] = useState('running');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [err, setErr] = useState('');
  const listRef = useRef(null);

  const messages = chats[activity] || [];
  const current = agents.find(a => a.id === activity) || FALLBACK[0];

  useEffect(() => {
    (async () => {
      try {
        const [t, u, saved, speak] = await Promise.all([
          SecureStore.getItemAsync('ac_token'), SecureStore.getItemAsync('api_url'),
          AsyncStorage.getItem('chats'), AsyncStorage.getItem('speak'),
        ]);
        if (t) setToken(t);
        if (u) setApiUrl(u);
        if (saved) setChats(JSON.parse(saved));
        if (speak) setSpeakReplies(speak === '1');
      } catch {}
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (ready) AsyncStorage.setItem('chats', JSON.stringify(chats)).catch(() => {}); }, [chats, ready]);
  useEffect(() => { if (token) loadAgents(); }, [token]);

  async function request(path, opts = {}) {
    if (!apiUrl) throw Error('Enter and save your HTTPS cloud server URL first.');
    const base = apiUrl.trim().replace(/\/+$/, '');
    const r = await fetch(base + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && token) { await signOut(); throw Error('Session expired. Please sign in again.'); }
    if (!r.ok) throw Error(j.error || `Request failed (${r.status})`);
    return j;
  }

  async function saveServer() {
    try {
      const u = apiUrl.trim().replace(/\/+$/, '');
      if (!/^https:\/\//i.test(u)) throw Error('Use the HTTPS URL provided by your cloud host.');
      await SecureStore.setItemAsync('api_url', u);
      setApiUrl(u);
      const r = await fetch(u + '/api/health').then(x => x.json()).catch(() => null);
      if (!r) throw Error('Saved, but the server did not answer. Check the URL (it can take ~1 minute to wake up).');
      setSetupMode(!!r.setupRequired);
      setErr(r.apiConfigured ? 'Server connected ✓' : 'Server connected, but no AI key is set on the server yet (add GROQ_API_KEY).');
    } catch (e) { setErr(e.message); }
  }

  async function authenticate() {
    try {
      setErr(''); setBusy(true);
      const path = setupMode ? '/api/auth/setup' : '/api/auth/login';
      const body = setupMode ? { setupKey, email, password } : { email, password };
      const j = await request(path, { method: 'POST', body: JSON.stringify(body) });
      await SecureStore.setItemAsync('ac_token', j.token);
      setPassword(''); setSetupKey('');
      setToken(j.token);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function signOut() {
    Speech.stop();
    await SecureStore.deleteItemAsync('ac_token');
    setToken(''); setSettingsOpen(false);
  }

  async function loadAgents() {
    try {
      const j = await request('/api/agents');
      setAgents(j.agents?.length ? j.agents : FALLBACK);
      setMode(j.controlMode || 'running');
    } catch (e) { setErr(e.message); }
  }

  function updateChat(id, fn) { setChats(c => ({ ...c, [id]: fn(c[id] || []) })); }

  async function send(textOverride) {
    const text = (textOverride ?? input).trim();
    if ((!text && !image) || busy) return;
    const act = activity;
    const userMsg = { role: 'user', content: text || 'What is in this photo?', image: image?.uri, at: Date.now() };
    const history = [...(chats[act] || []), userMsg];
    updateChat(act, () => history);
    setInput(''); setErr(''); setBusy(true);
    const img = image; setImage(null);
    try {
      const j = await request('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          activity: act,
          image: img?.dataUrl,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const answer = j.answer || '';
      updateChat(act, m => [...m, { role: 'assistant', content: answer, at: Date.now() }]);
      if (speakReplies) speak(answer);
    } catch (e) {
      updateChat(act, m => [...m, { role: 'assistant', content: '⚠️ ' + e.message, error: true, at: Date.now() }]);
    } finally { setBusy(false); }
  }

  function speak(text) {
    Speech.stop();
    Speech.speak(text.replace(/```[\s\S]*?```/g, ' (code block) ').slice(0, 3900));
  }

  async function pickImage(fromCamera) {
    try {
      const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setErr('Permission is needed to use photos.');
      const opts = { mediaTypes: ['images'], base64: true, quality: 0.35, allowsEditing: true };
      const r = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.[0]?.base64) return;
      const a = r.assets[0];
      setImage({ uri: a.uri, dataUrl: `data:${a.mimeType || 'image/jpeg'};base64,${a.base64}` });
    } catch (e) { setErr(e.message); }
  }

  function chooseImage() {
    Alert.alert('Add a photo', 'Ask the assistant about a picture, screenshot or document.', [
      { text: 'Camera', onPress: () => pickImage(true) },
      { text: 'Gallery', onPress: () => pickImage(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function toggleRecording() {
    if (recording) {
      try {
        setTranscribing(true);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const j = await request('/api/transcribe', { method: 'POST', body: JSON.stringify({ audio, mimeType: 'audio/m4a' }) });
        if (j.text) await send(j.text); else setErr("Couldn't hear anything. Try again.");
      } catch (e) { setErr(e.message); setRecording(null); } finally { setTranscribing(false); }
      return;
    }
    try {
      setErr(''); Speech.stop();
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return setErr('Microphone permission is needed for voice.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
    } catch (e) { setErr(e.message); }
  }

  function messageActions(m) {
    Alert.alert('Message', undefined, [
      { text: 'Copy', onPress: () => Clipboard.setStringAsync(m.content) },
      { text: 'Share', onPress: () => Share.share({ message: m.content }) },
      { text: 'Read aloud', onPress: () => speak(m.content) },
      { text: 'Close', style: 'cancel' },
    ]);
  }

  function newChat() {
    Speech.stop();
    updateChat(activity, () => []);
  }

  async function control(m) {
    try { const j = await request('/api/control', { method: 'POST', body: JSON.stringify({ mode: m }) }); setMode(j.controlMode); }
    catch (e) { setErr(e.message); }
  }

  if (!ready) return <View style={[s.page, s.center]}><ActivityIndicator color="#8aa2ff" /></View>;

  // ---------- Sign-in / setup ----------
  if (!token) return (
    <SafeAreaView style={s.page}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>✦ AI COMMANDER</Text>
        <Text style={s.title}>Your assistant for everything</Text>
        <Text style={s.muted}>Study, writing, translation, cooking, fitness, money, travel, coding, photos and more — by text or voice.</Text>
        <Text style={s.heading}>1. Cloud server</Text>
        <TextInput style={s.input} value={apiUrl} onChangeText={setApiUrl} placeholder="https://your-service.onrender.com" placeholderTextColor="#8090aa" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Pressable style={s.btn2} onPress={saveServer}><Text style={s.btnText}>Save & test server</Text></Pressable>
        <Text style={s.heading}>2. {setupMode ? 'Create owner account' : 'Sign in'}</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#8090aa" autoCapitalize="none" keyboardType="email-address" />
        {setupMode && <TextInput style={s.input} value={setupKey} onChangeText={setSetupKey} placeholder="OWNER_SETUP_KEY from Render" placeholderTextColor="#8090aa" secureTextEntry autoCapitalize="none" />}
        <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="Password (12+ characters)" placeholderTextColor="#8090aa" secureTextEntry />
        <Pressable style={s.btn} onPress={authenticate} disabled={busy}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>{setupMode ? 'Create account' : 'Sign in'}</Text>}</Pressable>
        <Pressable onPress={() => setSetupMode(v => !v)}><Text style={[s.muted, s.link]}>{setupMode ? 'Already have an account? Sign in' : 'First time? Create owner account'}</Text></Pressable>
        {!!err && <Text style={s.error}>{err}</Text>}
      </ScrollView>
    </SafeAreaView>
  );

  // ---------- Chat ----------
  const enabledAgents = agents.filter(a => a.enabled);
  return (
    <SafeAreaView style={s.page}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{current.icon} {current.name}</Text>
            <Text style={s.headerSub}>{mode === 'running' ? (busy ? 'Thinking…' : 'Online') : `System ${mode}`}</Text>
          </View>
          <Pressable style={s.iconBtn} onPress={() => { const v = !speakReplies; setSpeakReplies(v); AsyncStorage.setItem('speak', v ? '1' : '0'); if (!v) Speech.stop(); }}>
            <Text style={s.iconText}>{speakReplies ? '🔊' : '🔇'}</Text>
          </Pressable>
          <Pressable style={s.iconBtn} onPress={newChat}><Text style={s.iconText}>🗑️</Text></Pressable>
          <Pressable style={s.iconBtn} onPress={() => setSettingsOpen(true)}><Text style={s.iconText}>⚙️</Text></Pressable>
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {enabledAgents.map(a => (
              <Pressable key={a.id} onPress={() => setActivity(a.id)} style={[s.chip, a.id === activity && s.chipOn]}>
                <Text style={s.chipText}>{a.icon} {a.id === 'master' ? 'Auto' : a.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.list}
          data={messages}
          keyExtractor={(m, i) => String(m.at || i) + i}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>{current.icon}</Text>
              <Text style={s.emptyTitle}>{current.name}</Text>
              {!!current.description && <Text style={[s.muted, { textAlign: 'center' }]}>{current.description}</Text>}
              <Text style={[s.muted, { marginTop: 18 }]}>Try asking:</Text>
              {(SUGGESTIONS[activity] || SUGGESTIONS.master).map(q => (
                <Pressable key={q} style={s.suggest} onPress={() => (q.startsWith('📷') ? chooseImage() : send(q))}>
                  <Text style={s.suggestText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          }
          renderItem={({ item: m }) => (
            <Pressable onLongPress={() => messageActions(m)} style={[s.bubble, m.role === 'user' ? s.user : s.bot, m.error && s.bubbleErr]}>
              {!!m.image && <Image source={{ uri: m.image }} style={s.thumb} />}
              <Text selectable style={s.msgText}>{m.content}</Text>
              {m.role === 'assistant' && !m.error && <Text style={s.hint}>Long-press to copy, share or listen</Text>}
            </Pressable>
          )}
          ListFooterComponent={busy ? <View style={[s.bubble, s.bot]}><ActivityIndicator color="#8aa2ff" /></View> : null}
        />

        {!!err && <Pressable onPress={() => setErr('')}><Text style={[s.error, { marginHorizontal: 14 }]}>{err}  ✕</Text></Pressable>}
        {!!image && (
          <View style={s.preview}>
            <Image source={{ uri: image.uri }} style={s.previewImg} />
            <Text style={[s.muted, { flex: 1, marginTop: 0 }]}>Photo attached — type a question or just send.</Text>
            <Pressable onPress={() => setImage(null)}><Text style={s.iconText}>✕</Text></Pressable>
          </View>
        )}

        <View style={s.inputBar}>
          <Pressable style={s.roundBtn} onPress={chooseImage} disabled={busy}><Text style={s.iconText}>📷</Text></Pressable>
          <TextInput
            style={s.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder={recording ? 'Listening… tap ⏹ to finish' : transcribing ? 'Understanding your voice…' : 'Ask anything…'}
            placeholderTextColor="#8090aa"
            multiline
          />
          {input.trim() || image ? (
            <Pressable style={[s.roundBtn, s.sendBtn]} onPress={() => send()} disabled={busy}><Text style={s.iconText}>➤</Text></Pressable>
          ) : (
            <Pressable style={[s.roundBtn, recording && s.recBtn]} onPress={toggleRecording} disabled={busy || transcribing}>
              {transcribing ? <ActivityIndicator color="white" /> : <Text style={s.iconText}>{recording ? '⏹' : '🎤'}</Text>}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={settingsOpen} animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <SafeAreaView style={s.page}>
          <ScrollView contentContainerStyle={s.body}>
            <View style={s.row}>
              <Text style={[s.title, { flex: 1 }]}>Settings</Text>
              <Pressable onPress={() => setSettingsOpen(false)}><Text style={s.iconText}>✕</Text></Pressable>
            </View>
            <Text style={s.muted}>Server: {apiUrl}</Text>
            <Text style={s.heading}>Assistant: {mode}</Text>
            <View style={s.row}>
              <Pressable style={[s.btn, { flex: 1 }]} onPress={() => control('resume')}><Text style={s.btnText}>Resume</Text></Pressable>
              <Pressable style={[s.btn2, { flex: 1 }]} onPress={() => control('pause')}><Text style={s.btnText}>Pause</Text></Pressable>
              <Pressable style={[s.stop, { flex: 1 }]} onPress={() => control('stop')}><Text style={s.btnText}>Stop</Text></Pressable>
            </View>
            <Text style={s.heading}>Activities</Text>
            <Text style={s.muted}>Turn off the ones you don't need.</Text>
            {agents.map(a => (
              <View style={s.agent} key={a.id}>
                <Text style={[s.iconText, { marginRight: 10 }]}>{a.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{a.name}</Text>
                  <Text style={[s.muted, { marginTop: 2 }]}>{a.description}</Text>
                </View>
                <Switch
                  value={!!a.enabled}
                  disabled={a.id === 'master'}
                  onValueChange={async v => {
                    try {
                      await request(`/api/agents/${a.id}/toggle`, { method: 'POST', body: JSON.stringify({ enabled: v }) });
                      if (!v && activity === a.id) setActivity('master');
                      loadAgents();
                    } catch (e) { setErr(e.message); }
                  }}
                />
              </View>
            ))}
            <Pressable style={[s.btn2, { marginTop: 24 }]} onPress={() => Alert.alert('Clear all chats?', 'This removes chat history saved on this phone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => setChats({}) }])}>
              <Text style={s.btnText}>Clear all chat history</Text>
            </Pressable>
            <Pressable style={s.stop} onPress={signOut}><Text style={s.btnText}>Sign out</Text></Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0b1220', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingBottom: 50 },
  logo: { color: '#c8d8ff', fontWeight: '900', letterSpacing: 2, fontSize: 17, marginVertical: 20 },
  title: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 6, marginTop: 8 },
  heading: { color: 'white', fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 6 },
  muted: { color: '#93a2b8', fontSize: 13, marginTop: 8, lineHeight: 18 },
  link: { color: '#9fb4ff', marginTop: 14, textAlign: 'center' },
  input: { backgroundColor: '#111e31', borderColor: '#30415e', borderWidth: 1, borderRadius: 10, padding: 13, color: 'white', marginVertical: 8 },
  btn: { backgroundColor: '#6683f0', padding: 13, borderRadius: 10, alignItems: 'center', marginVertical: 6 },
  btn2: { backgroundColor: '#25344d', padding: 13, borderRadius: 10, alignItems: 'center', marginVertical: 6 },
  stop: { backgroundColor: '#5a2b38', padding: 13, borderRadius: 10, alignItems: 'center', marginVertical: 6 },
  btnText: { color: 'white', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  agent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomColor: '#26354c', borderBottomWidth: 1 },
  name: { color: 'white', fontWeight: '700' },
  error: { color: '#ff9b9b', marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomColor: '#1d2a40', borderBottomWidth: 1 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#7fd1a5', fontSize: 12, marginTop: 2 },
  iconBtn: { padding: 8, marginLeft: 2 },
  iconText: { fontSize: 20, color: 'white' },
  chips: { paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  chip: { backgroundColor: '#16233a', borderColor: '#2b3b58', borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  chipOn: { backgroundColor: '#3b52b4', borderColor: '#6683f0' },
  chipText: { color: 'white', fontSize: 13, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 20, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginTop: 8 },
  suggest: { backgroundColor: '#142038', borderColor: '#2b3b58', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8, alignSelf: 'stretch' },
  suggestText: { color: '#d3ddf5' },
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 14, marginVertical: 5 },
  user: { alignSelf: 'flex-end', backgroundColor: '#3b52b4', borderBottomRightRadius: 4 },
  bot: { alignSelf: 'flex-start', backgroundColor: '#172842', borderBottomLeftRadius: 4 },
  bubbleErr: { backgroundColor: '#3a2030' },
  msgText: { color: 'white', fontSize: 15, lineHeight: 21 },
  hint: { color: '#6f7f99', fontSize: 10, marginTop: 6 },
  thumb: { width: 180, height: 180, borderRadius: 10, marginBottom: 8 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, padding: 8, backgroundColor: '#142038', borderRadius: 10 },
  previewImg: { width: 48, height: 48, borderRadius: 6 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopColor: '#1d2a40', borderTopWidth: 1 },
  chatInput: { flex: 1, backgroundColor: '#111e31', borderColor: '#30415e', borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: 'white', maxHeight: 130, fontSize: 15 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#25344d', alignItems: 'center', justifyContent: 'center' },
  sendBtn: { backgroundColor: '#6683f0' },
  recBtn: { backgroundColor: '#c0394f' },
});
