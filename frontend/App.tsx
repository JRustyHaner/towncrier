import React from 'react';
import { SafeAreaView, View, Text, TextInput, Button, StyleSheet, FlatList } from 'react-native';

export default function App() {
  const [terms, setTerms] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [searchId, setSearchId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string>('idle');

  const startSearch = async () => {
    setStatus('starting');
    try {
      const r = await fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms: terms.split(/\s+/), limit: 20 })
      });
      const j = await r.json();
      setSearchId(j.search_id);
      setStatus('processing');
      pollResults(j.search_id);
    } catch (e) {
      setStatus('error');
    }
  };

  const pollResults = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`http://localhost:3000/api/search/${id}/results`);
        const j = await r.json();
        if (j.ready) {
          clearInterval(interval);
          setResults(j.geojson.features);
          setStatus('complete');
        }
      } catch (e) {
        clearInterval(interval);
        setStatus('error');
      }
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Towncrier (Stateless)</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={terms}
          onChangeText={setTerms}
          placeholder="Search terms"
        />
        <Button title="Search" onPress={startSearch} />
      </View>
      <Text>Status: {status}</Text>
      {searchId && <Text>ID: {searchId}</Text>}
      <FlatList
        data={results}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <Text>{JSON.stringify(item)}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, paddingHorizontal: 8, height: 40 },
  title: { fontSize: 20, fontWeight: '600' }
});
