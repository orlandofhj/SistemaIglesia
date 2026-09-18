package com.iglesiadelacalle.sistemaiglesia.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.iglesiadelacalle.sistemaiglesia.models.Planificacion;
import java.util.List;

@Repository
public interface PlanificacionRepository extends JpaRepository<Planificacion, Integer> {
    
    // Busca todas las evaluaciones asociadas al ID de una clase
    List<Planificacion> findByClaseTeologia_IdClaseTeologia(Integer idClaseTeologia);
}