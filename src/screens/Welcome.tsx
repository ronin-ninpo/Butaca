import { Link, useNavigate } from 'react-router-dom';
import { KeyForm } from '../components/KeyForm';

export function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="welcome">
      <img className="logo" src="./icon-192.png" alt="" />
      <h1 style={{ fontSize: 28, fontWeight: 850, letterSpacing: '-0.02em', marginTop: 16 }}>Te damos la bienvenida a Butaca</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Descubrí películas y series con sinopsis sin spoilers, reparto, dirección y nota de IMDb. Marcá lo que querés ver, calificá lo que viste y te
        recomendamos según tus gustos.
      </p>
      <Link to="/cuenta" className="card row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
        <div>
          <b>¿Ya usás Butaca en otro dispositivo?</b>
          <div className="muted small">Ingresá con tu cuenta y se cargan tus listas y claves.</div>
        </div>
        <span className="btn small primary">Ingresar</span>
      </Link>
      <div className="banner" style={{ marginTop: 14 }}>
        <span style={{ fontSize: 18 }}>🔑</span>
        <div>
          Para buscar películas, la app usa <b>TMDB</b>, una base de datos de cine gratuita. Necesitás una clave personal (tarda 2 minutos). Las claves y tus listas
          quedan guardadas solo en este celular.
        </div>
      </div>
      <KeyForm onSaved={() => navigate('/', { replace: true })} />
      <div className="attribution">
        <span>Esta app usa la API de TMDB pero no está avalada ni certificada por TMDB.</span>
      </div>
    </div>
  );
}
