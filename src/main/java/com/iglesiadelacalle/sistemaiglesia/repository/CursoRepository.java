package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.Curso;

@Repository
public interface CursoRepository extends JpaRepository<Curso, Integer> {
    // 🔥 NUEVA LÍNEA: Verifica si ya existe el bloque en ese año
    boolean existsByBloque_IdBloqueAndAnio(Integer idBloque, Integer anio);
}