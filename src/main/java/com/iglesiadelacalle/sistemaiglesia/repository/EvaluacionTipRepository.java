package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.EvaluacionTip;

import java.util.List;

import java.util.Optional;

@Repository
public interface EvaluacionTipRepository extends JpaRepository<EvaluacionTip, Integer> {

    //List<EvaluacionTip> findByCurso_IdCurso(Integer idCurso);
    
    // 🔥 BUSCAR NOTA ESPECÍFICA DE UN ALUMNO EN UN TIP 🔥
    Optional<EvaluacionTip> findByCurso_IdCursoAndTip_IdTipAndEstudiante_IdPersona(Integer idCurso, Integer idTip, Integer idEstudiante);
    
    // 🔥 OBTENER TODAS LAS NOTAS DE UN TIP EN UNA CLASE 🔥
    List<EvaluacionTip> findByCurso_IdCursoAndTip_IdTip(Integer idCurso, Integer idTip);
    
    // Busca todas las evaluaciones hechas en un curso específico
    List<EvaluacionTip> findByCurso_IdCurso(Integer idCurso);
    
    // Verifica si un tip en específico ya fue evaluado en un curso
    boolean existsByCurso_IdCursoAndTip_IdTip(Integer idCurso, Integer idTip);
}