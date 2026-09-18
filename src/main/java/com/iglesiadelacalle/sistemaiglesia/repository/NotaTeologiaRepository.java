package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.iglesiadelacalle.sistemaiglesia.models.NotaTeologia;
import java.util.Optional;

@Repository
public interface NotaTeologiaRepository extends JpaRepository<NotaTeologia, Integer> {

    // ⚡ MÉTODO BLINDADO CON @QUERY PARA EVITAR ERRORES DE SINTAXIS DE SPRING DATA
    @Query("SELECT n FROM NotaTeologia n WHERE n.claseTeologia.idClaseTeologia = :idClase AND n.planificacion.idPlanificacion = :idPlan AND n.estudiante.idPersona = :idEstudiante")
    Optional<NotaTeologia> buscarNotaExacta(
        @Param("idClase") Integer idClase, 
        @Param("idPlan") Integer idPlan, 
        @Param("idEstudiante") Integer idEstudiante
    );
}